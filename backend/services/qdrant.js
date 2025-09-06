import 'dotenv/config'
import { QdrantClient } from '@qdrant/js-client-rest'

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY || undefined,
})

export async function ensureCollection(userId = null) {
  const baseName = process.env.QDRANT_COLLECTION || 'chaicode-collection'
  const name = userId ? `${baseName}-user-${userId}` : baseName
  const dim = Number(process.env.EMBEDDING_DIM || 1536)
  const { collections } = await qdrant.getCollections()
  const exists = collections.some(c => c.name === name)
  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: { size: dim, distance: 'Cosine' },
    })
    console.log('[qdrant] created collection:', name)
  } else {
    console.log('[qdrant] using collection:', name)
  }
  return name
}

export function getCollectionName(userId = null) {
  const baseName = process.env.QDRANT_COLLECTION || 'chaicode-collection'
  return userId ? `${baseName}-user-${userId}` : baseName
}
