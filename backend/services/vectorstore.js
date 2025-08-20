import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant'
import { embeddings } from './embedding.js'
import { qdrant, ensureCollection } from './qdrant.js'

const COLLECTION = process.env.QDRANT_COLLECTION || 'chaicode-collection'

async function getVectorStore() {
  return QdrantVectorStore.fromExistingCollection(embeddings, {
    client: qdrant,
    collectionName: COLLECTION,
  })
}

export async function addDocuments(docs) {
  await ensureCollection()
  await QdrantVectorStore.fromDocuments(docs, embeddings, {
    client: qdrant,
    collectionName: COLLECTION,
  })
  console.log(`[vectorstore] added ${docs.length} chunks → ${COLLECTION}`)
}

export async function similaritySearch(query, topK = Number(process.env.RAG_TOP_K || 5), filter) {
  await ensureCollection()
  const store = await getVectorStore()
  return store.similaritySearch(query, topK, filter)
}

export async function similaritySearchFiltered(
  query,
  {
    topK = Number(process.env.RAG_TOP_K || 5),
    minSimilarity = 0.60,
    oversample = Math.max(10, topK * 4),
  } = {}
) {
  await ensureCollection()
  const store = await getVectorStore()

  const pairs = await store.similaritySearchWithScore(query, oversample)
  if (!pairs.length) return []

  const picked = []
  for (const [doc, distance] of pairs) {
    const sim = 1 - Math.min(Math.max(distance, 0), 1)
    if (sim >= minSimilarity) picked.push(doc)
    if (picked.length >= topK) break
  }
  if (picked.length === 0) return pairs.slice(0, topK).map(([doc]) => doc)
  return picked
}
