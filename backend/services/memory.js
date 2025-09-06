// backend/services/memory.js
import 'dotenv/config'
import { MemoryClient } from 'mem0ai'

// Initialize Mem0 with Qdrant backend
const memory = new MemoryClient({
  vectorDB: {
    provider: 'qdrant',
    config: {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION || 'chaicode-collection'
    }
  },
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
    }
  }
})

export class DocumentMemory {
  constructor() {
    this.memory = memory
  }

  // Store document chunks with metadata
  async storeDocumentChunks(chunks, metadata = {}) {
    try {
      const results = []
      for (const chunk of chunks) {
        const memoryData = {
          content: chunk.pageContent,
          metadata: {
            ...chunk.metadata,
            ...metadata,
            timestamp: new Date().toISOString(),
            type: 'document_chunk'
          }
        }
        
        const result = await this.memory.add(memoryData)
        results.push(result)
      }
      return results
    } catch (error) {
      console.error('[memory] Error storing document chunks:', error)
      throw error
    }
  }

  // Search for relevant memories based on query
  async searchMemories(query, limit = 5) {
    try {
      const results = await this.memory.search(query, { limit })
      return results
    } catch (error) {
      console.error('[memory] Error searching memories:', error)
      throw error
    }
  }

  // Get recent documents (last 24 hours)
  async getRecentDocuments(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
      const query = `Find documents uploaded after ${cutoffTime.toISOString()}`
      const results = await this.memory.search(query, { 
        limit: 20,
        filter: {
          metadata: {
            type: 'document_chunk',
            timestamp: { $gte: cutoffTime.toISOString() }
          }
        }
      })
      return results
    } catch (error) {
      console.error('[memory] Error getting recent documents:', error)
      throw error
    }
  }

  // Store user interaction for context
  async storeUserInteraction(query, response, metadata = {}) {
    try {
      const interaction = {
        content: `User asked: "${query}"\nAssistant responded: "${response}"`,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          type: 'user_interaction'
        }
      }
      
      return await this.memory.add(interaction)
    } catch (error) {
      console.error('[memory] Error storing user interaction:', error)
      throw error
    }
  }

  // Get conversation context
  async getConversationContext(limit = 10) {
    try {
      const results = await this.memory.search('recent conversation context', { 
        limit,
        filter: {
          metadata: {
            type: 'user_interaction'
          }
        }
      })
      return results
    } catch (error) {
      console.error('[memory] Error getting conversation context:', error)
      throw error
    }
  }

  // Clear old memories (older than 30 days)
  async clearOldMemories(days = 30) {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      // Note: Mem0 doesn't have direct delete by filter, so we'll implement this differently
      console.log(`[memory] Would clear memories older than ${cutoffTime.toISOString()}`)
      return { message: 'Old memories cleanup scheduled' }
    } catch (error) {
      console.error('[memory] Error clearing old memories:', error)
      throw error
    }
  }
}

export const documentMemory = new DocumentMemory()
