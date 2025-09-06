import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant'
import { embeddings } from './embedding.js'
import { qdrant, ensureCollection, getCollectionName } from './qdrant.js'

async function getVectorStore(userId = null) {
  const collectionName = getCollectionName(userId)
  return QdrantVectorStore.fromExistingCollection(embeddings, {
    client: qdrant,
    collectionName: collectionName,
  })
}

export async function addDocuments(docs, userId = null) {
  const collectionName = await ensureCollection(userId)
  await QdrantVectorStore.fromDocuments(docs, embeddings, {
    client: qdrant,
    collectionName: collectionName,
  })
  console.log(`[vectorstore] added ${docs.length} chunks → ${collectionName}`)
}

export async function similaritySearch(query, topK = Number(process.env.RAG_TOP_K || 5), filter, userId = null) {
  await ensureCollection(userId)
  const store = await getVectorStore(userId)
  
  // Add user filter if userId is provided
  const searchFilter = userId ? { ...filter, userId } : filter
  return store.similaritySearch(query, topK, searchFilter)
}

export async function similaritySearchFiltered(
  query,
  {
    topK = Number(process.env.RAG_TOP_K || 5),
    minSimilarity = 0.60,
    oversample = Math.max(10, topK * 4),
    userId = null,
  } = {}
) {
  await ensureCollection(userId)
  const store = await getVectorStore(userId)

  // Add user filter if userId is provided
  const searchFilter = userId ? { userId } : undefined
  const pairs = await store.similaritySearchWithScore(query, oversample, searchFilter)
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

// Get embeddings for a text string
export async function getEmbeddings(text) {
  return await embeddings.embedQuery(text)
}

// Search using a pre-computed embedding (for true HyDE)
export async function similaritySearchWithEmbedding(
  embedding,
  {
    topK = Number(process.env.RAG_TOP_K || 5),
    minSimilarity = 0.60,
    oversample = Math.max(10, topK * 4),
    userId = null,
  } = {}
) {
  const collectionName = await ensureCollection(userId)
  const store = await getVectorStore(userId)

  // Use the Qdrant client directly for embedding-based search
  const searchParams = {
    vector: embedding,
    limit: oversample,
    with_payload: true,
    with_vector: false
  }

  // Add user filter if userId is provided
  if (userId) {
    searchParams.filter = {
      must: [
        {
          key: "userId",
          match: {
            value: userId
          }
        }
      ]
    }
  }

  const results = await qdrant.search(collectionName, searchParams)

  if (!results.length) return []

  const picked = []
  for (const result of results) {
    const sim = result.score
    if (sim >= minSimilarity) {
      picked.push({
        pageContent: result.payload.text || result.payload.pageContent,
        metadata: result.payload.metadata || {}
      })
    }
    if (picked.length >= topK) break
  }
  
  if (picked.length === 0) {
    return results.slice(0, topK).map(result => ({
      pageContent: result.payload.text || result.payload.pageContent,
      metadata: result.payload.metadata || {}
    }))
  }
  
  return picked
}
