import { MongoClient } from 'mongodb'

let client = null
let db = null

export async function connectToDatabase() {
  if (client && db) {
    return { client, db }
  }

  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_DB_URL
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables')
    }

    client = new MongoClient(uri)
    await client.connect()
    db = client.db('chaidocchat')

    console.log('✅ Connected to MongoDB')
    return { client, db }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

export async function getDatabase() {
  if (!db) {
    await connectToDatabase()
  }
  return db
}

export async function closeDatabase() {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('🔌 MongoDB connection closed')
  }
}
