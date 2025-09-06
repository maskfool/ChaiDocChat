// backend/services/memory-simple.js - Simple memory system without Mem0 API issues
import 'dotenv/config'

// User-specific memory storage
const userMemoryStores = new Map()

export class SimpleDocumentMemory {
  constructor(userId = 'default') {
    this.userId = userId
    if (!userMemoryStores.has(userId)) {
      userMemoryStores.set(userId, [])
    }
    this.memory = userMemoryStores.get(userId)
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
            userId: this.userId,
            timestamp: new Date().toISOString(),
            type: 'document_chunk'
          }
        }
        
        this.memory.push(memoryData)
        results.push({ id: Date.now() + Math.random() })
      }
      console.log(`[memory-simple] Stored ${chunks.length} document chunks for user ${this.userId}`)
      return results
    } catch (error) {
      console.error('[memory-simple] Error storing document chunks:', error)
      throw error
    }
  }

  // Search for relevant memories based on query
  async searchMemories(query, limit = 5) {
    try {
      // Simple text search in memory
      const results = this.memory
        .filter(item => 
          item.content.toLowerCase().includes(query.toLowerCase()) ||
          item.metadata?.type === 'user_interaction'
        )
        .slice(0, limit)
      
      console.log(`[memory-simple] Found ${results.length} memories for query: ${query}`)
      return results
    } catch (error) {
      console.error('[memory-simple] Error searching memories:', error)
      return []
    }
  }

  // Get recent documents (last 24 hours)
  async getRecentDocuments(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
      const results = this.memory.filter(item => 
        item.metadata?.type === 'document_chunk' &&
        new Date(item.metadata?.timestamp) >= cutoffTime
      )
      
      console.log(`[memory-simple] Found ${results.length} recent documents`)
      return results
    } catch (error) {
      console.error('[memory-simple] Error getting recent documents:', error)
      return []
    }
  }

  // Store user interaction for context
  async storeUserInteraction(query, response, metadata = {}) {
    try {
      const interaction = {
        content: `User: "${query}"\nAssistant: "${response}"`,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          type: 'user_interaction'
        }
      }
      
      this.memory.push(interaction)
      console.log(`[memory-simple] Stored user interaction: ${query.substring(0, 50)}...`)
      return { id: Date.now() + Math.random() }
    } catch (error) {
      console.error('[memory-simple] Error storing user interaction:', error)
      throw error
    }
  }

  // Get conversation context
  async getConversationContext(limit = 10) {
    try {
      const results = this.memory
        .filter(item => item.metadata?.type === 'user_interaction')
        .slice(-limit) // Get last N interactions
      
      console.log(`[memory-simple] Retrieved ${results.length} conversation contexts`)
      return results
    } catch (error) {
      console.error('[memory-simple] Error getting conversation context:', error)
      return []
    }
  }

  // Clear old memories (older than 30 days)
  async clearOldMemories(days = 30) {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const initialLength = this.memory.length
      
      this.memory = this.memory.filter(item => 
        new Date(item.metadata?.timestamp) >= cutoffTime
      )
      
      const removedCount = initialLength - this.memory.length
      console.log(`[memory-simple] Cleared ${removedCount} old memories`)
      return { message: `Cleared ${removedCount} old memories` }
    } catch (error) {
      console.error('[memory-simple] Error clearing old memories:', error)
      throw error
    }
  }

  // Get memory statistics
  async getMemoryStats() {
    const stats = {
      totalMemories: this.memory.length,
      documentChunks: this.memory.filter(item => item.metadata?.type === 'document_chunk').length,
      userInteractions: this.memory.filter(item => item.metadata?.type === 'user_interaction').length,
      oldestMemory: this.memory.length > 0 ? Math.min(...this.memory.map(item => new Date(item.metadata?.timestamp).getTime())) : null,
      newestMemory: this.memory.length > 0 ? Math.max(...this.memory.map(item => new Date(item.metadata?.timestamp).getTime())) : null
    }
    return stats
  }
}

export const documentMemory = new SimpleDocumentMemory()
