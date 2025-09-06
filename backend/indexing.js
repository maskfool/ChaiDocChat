import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { getTypeFromPath } from "./utils/filetype.js"
import { fromPdf } from "./loaders/fromPdf.js"
import { fromCsv } from "./loaders/fromCsv.js"
import { fromJson } from "./loaders/fromJson.js"
import { fromText } from "./loaders/fromText.js"
import { fromUrl } from "./loaders/fromUrl.js"
import { fromUrlEnhanced, fromDocumentationSite } from "./loaders/fromUrlEnhanced.js"
import { addDocuments } from "./services/vectorstore.js"

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
})

function normalizeDoc(d) {
  d.pageContent = d.pageContent
    .replace(/\t+/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \u00A0]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return d
}

async function splitAndStore(rawDocs, userId = null) {
  const cleaned = rawDocs.map(normalizeDoc)
  const chunks = await splitter.splitDocuments(cleaned)
  console.log(`[index] Split into ${chunks.length} chunks (size≈${splitter.chunkSize}, overlap=${splitter.chunkOverlap})`)
  
  // Add user context to each chunk
  if (userId) {
    chunks.forEach(chunk => {
      chunk.metadata = {
        ...chunk.metadata,
        userId: userId
      }
    })
  }
  
  await addDocuments(chunks, userId)
  return chunks.length
}

export async function indexFile(filePath, explicitType, userId = null) {
  const type = explicitType || getTypeFromPath(filePath)
  if (!type) throw new Error(`Unsupported file type for: ${filePath}`)

  let rawDocs = []
  if (type === "pdf")  rawDocs = await fromPdf(filePath)
  if (type === "csv")  rawDocs = await fromCsv(filePath)
  if (type === "json") rawDocs = await fromJson(filePath)
  if (type === "txt")  rawDocs = await fromText(filePath)

  console.log(`[index] Loaded ${rawDocs.length} document(s) from ${type.toUpperCase()}`)
  const chunksIndexed = await splitAndStore(rawDocs, userId)
  return { type, chunksIndexed }
}

export async function indexText(text, { source = "pasted-text", userId = null } = {}) {
  if (!text || !text.trim()) throw new Error("Empty text")
  const rawDocs = [{ pageContent: text, metadata: { source } }]
  console.log(`[index] Loaded 1 document from TEXT (${source})`)
  const chunksIndexed = await splitAndStore(rawDocs, userId)
  return { type: "text", chunksIndexed }
}

export async function indexUrl(url, options = {}) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL")
  
  const { depth = 1, maxPages = 10, enhanced = false, userId = null } = options;
  
  let rawDocs;
  if (enhanced || depth > 1) {
    console.log(`[index] Using enhanced crawler for: ${url}`);
    rawDocs = await fromUrlEnhanced(url, { maxPages, maxDepth: depth });
  } else {
    rawDocs = await fromUrl(url);
  }
  
  console.log(`[index] Loaded ${rawDocs.length} document(s) from URL: ${url}`)
  const chunksIndexed = await splitAndStore(rawDocs, userId)
  return { type: "url", chunksIndexed, pagesCrawled: rawDocs.length }
}

export async function indexDocumentationSite(url, options = {}) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL")
  
  const { userId = null, ...crawlOptions } = options;
  
  console.log(`[index] Crawling documentation site: ${url}`);
  const rawDocs = await fromDocumentationSite(url, crawlOptions);
  
  console.log(`[index] Loaded ${rawDocs.length} document(s) from documentation site: ${url}`)
  const chunksIndexed = await splitAndStore(rawDocs, userId)
  return { type: "documentation", chunksIndexed, pagesCrawled: rawDocs.length }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filePath = process.argv[2]
  const explicitType = process.argv[3]
  if (!filePath) {
    console.error("Usage: node src/indexing.js <path> [pdf|csv|json|txt]")
    process.exit(1)
  }
  indexFile(filePath, explicitType)
    .then(r => console.log("[index] done:", r))
    .catch(e => { console.error(e); process.exit(1) })
}
