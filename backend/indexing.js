import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { getTypeFromPath } from "./utils/filetype.js"
import { fromPdf } from "./loaders/fromPdf.js"
import { fromCsv } from "./loaders/fromCsv.js"
import { fromJson } from "./loaders/fromJson.js"
import { fromText } from "./loaders/fromText.js"
import { fromUrl } from "./loaders/fromUrl.js"
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

async function splitAndStore(rawDocs) {
  const cleaned = rawDocs.map(normalizeDoc)
  const chunks = await splitter.splitDocuments(cleaned)
  console.log(`[index] Split into ${chunks.length} chunks (size≈${splitter.chunkSize}, overlap=${splitter.chunkOverlap})`)
  await addDocuments(chunks)
  return chunks.length
}

export async function indexFile(filePath, explicitType) {
  const type = explicitType || getTypeFromPath(filePath)
  if (!type) throw new Error(`Unsupported file type for: ${filePath}`)

  let rawDocs = []
  if (type === "pdf")  rawDocs = await fromPdf(filePath)
  if (type === "csv")  rawDocs = await fromCsv(filePath)
  if (type === "json") rawDocs = await fromJson(filePath)
  if (type === "txt")  rawDocs = await fromText(filePath)

  console.log(`[index] Loaded ${rawDocs.length} document(s) from ${type.toUpperCase()}`)
  const chunksIndexed = await splitAndStore(rawDocs)
  return { type, chunksIndexed }
}

export async function indexText(text, { source = "pasted-text" } = {}) {
  if (!text || !text.trim()) throw new Error("Empty text")
  const rawDocs = [{ pageContent: text, metadata: { source } }]
  console.log(`[index] Loaded 1 document from TEXT (${source})`)
  const chunksIndexed = await splitAndStore(rawDocs)
  return { type: "text", chunksIndexed }
}

export async function indexUrl(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Invalid URL")
  const rawDocs = await fromUrl(url)
  console.log(`[index] Loaded ${rawDocs.length} document(s) from URL: ${url}`)
  const chunksIndexed = await splitAndStore(rawDocs)
  return { type: "url", chunksIndexed }
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
