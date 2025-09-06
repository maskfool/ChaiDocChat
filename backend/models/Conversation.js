import { getDatabase } from './database.js'

export class Conversation {
  constructor(data) {
    this.userId = data.userId
    this.messages = data.messages || []
    this.title = data.title || 'New Conversation'
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
    this.isActive = data.isActive !== false // default to true
  }

  static async create(conversationData) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    
    const conversation = new Conversation(conversationData)
    const result = await conversations.insertOne(conversation)
    return { ...conversation, _id: result.insertedId }
  }

  static async findByUserId(userId, limit = 50) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray()
  }

  static async findActiveConversation(userId) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations.findOne({ userId, isActive: true })
  }

  static async findByIdAndUserId(conversationId, userId) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations.findOne({ _id: conversationId, userId })
  }

  static async addMessage(conversationId, userId, message) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    
    const messageWithId = {
      ...message,
      id: Date.now() + Math.random(),
      timestamp: new Date()
    }

    return await conversations.updateOne(
      { _id: conversationId, userId },
      { 
        $push: { messages: messageWithId },
        $set: { updatedAt: new Date() }
      }
    )
  }

  static async updateTitle(conversationId, userId, title) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations.updateOne(
      { _id: conversationId, userId },
      { 
        $set: { 
          title,
          updatedAt: new Date()
        }
      }
    )
  }

  static async setActive(conversationId, userId) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    
    // First, set all conversations for this user to inactive
    await conversations.updateMany(
      { userId },
      { $set: { isActive: false } }
    )
    
    // Then set the specified conversation as active
    return await conversations.updateOne(
      { _id: conversationId, userId },
      { 
        $set: { 
          isActive: true,
          updatedAt: new Date()
        }
      }
    )
  }

  static async deleteConversation(conversationId, userId) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations.deleteOne({ _id: conversationId, userId })
  }

  static async deleteAllUserConversations(userId) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations.deleteMany({ userId })
  }

  static async getRecentConversations(userId, limit = 10) {
    const db = await getDatabase()
    const conversations = db.collection('conversations')
    return await conversations
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray()
  }
}
