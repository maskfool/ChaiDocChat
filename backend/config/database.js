import { MongoClient } from 'mongodb'
import { config } from './env.js'
import logger from './logger.js'

let client = null
let db = null

export async function connectToDatabase() {
  if (client && db) {
    return { client, db }
  }

  try {
    client = new MongoClient(config.database.uri, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    })
    
    await client.connect()
    db = client.db('chaidocchat')

    // Create indexes for better performance
    await createIndexes(db)
    
    logger.info('✅ Connected to MongoDB with indexes')
    return { client, db }
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error)
    throw error
  }
}

async function createIndexes(db) {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ clerkUserId: 1 }, { unique: true })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ lastActive: -1 })
    await db.collection('users').createIndex({ createdAt: -1 })

    // Documents collection indexes
    await db.collection('documents').createIndex({ userId: 1 })
    await db.collection('documents').createIndex({ userId: 1, uploadDate: -1 })
    await db.collection('documents').createIndex({ userId: 1, source: 1 })
    await db.collection('documents').createIndex({ fileName: 1 })
    await db.collection('documents').createIndex({ fileType: 1 })

    // Conversations collection indexes
    await db.collection('conversations').createIndex({ userId: 1 })
    await db.collection('conversations').createIndex({ userId: 1, createdAt: -1 })
    await db.collection('conversations').createIndex({ userId: 1, updatedAt: -1 })
    await db.collection('conversations').createIndex({ 'messages.timestamp': -1 })

    // Text search indexes for better search performance
    await db.collection('documents').createIndex({ 
      fileName: 'text', 
      source: 'text' 
    })

    logger.info('✅ Database indexes created successfully')
  } catch (error) {
    logger.error('❌ Error creating database indexes:', error)
    // Don't throw here as the app can still work without indexes
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
    logger.info('🔌 MongoDB connection closed')
  }
}

// Health check for database
export async function checkDatabaseHealth() {
  try {
    if (!db) {
      await connectToDatabase()
    }
    
    await db.admin().ping()
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    logger.error('Database health check failed:', error)
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() }
  }
}
