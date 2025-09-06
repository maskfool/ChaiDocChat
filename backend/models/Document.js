import { getDatabase } from './database.js'

export class Document {
  constructor(data) {
    this.userId = data.userId
    this.fileName = data.fileName
    this.fileType = data.fileType
    this.filePath = data.filePath
    this.fileSize = data.fileSize
    this.uploadDate = data.uploadDate || new Date()
    this.chunksIndexed = data.chunksIndexed || 0
    this.source = data.source || 'file' // file, text, url, documentation
    this.originalUrl = data.originalUrl // for URL uploads
  }

  static async create(documentData) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    
    const document = new Document(documentData)
    const result = await documents.insertOne(document)
    return { ...document, _id: result.insertedId }
  }

  static async findByUserId(userId, limit = 50) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    return await documents
      .find({ userId })
      .sort({ uploadDate: -1 })
      .limit(limit)
      .toArray()
  }

  static async findByUserIdAndSource(userId, source, limit = 50) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    return await documents
      .find({ userId, source })
      .sort({ uploadDate: -1 })
      .limit(limit)
      .toArray()
  }

  static async findByIdAndUserId(documentId, userId) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    return await documents.findOne({ _id: documentId, userId })
  }

  static async updateChunksIndexed(documentId, userId, chunksIndexed) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    return await documents.updateOne(
      { _id: documentId, userId },
      { $set: { chunksIndexed } }
    )
  }

  static async deleteDocument(documentId, userId) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    return await documents.deleteOne({ _id: documentId, userId })
  }

  static async deleteAllUserDocuments(userId) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    return await documents.deleteMany({ userId })
  }

  static async getRecentDocuments(userId, hours = 24) {
    const db = await getDatabase()
    const documents = db.collection('documents')
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    return await documents
      .find({ 
        userId, 
        uploadDate: { $gte: cutoffDate } 
      })
      .sort({ uploadDate: -1 })
      .toArray()
  }
}
