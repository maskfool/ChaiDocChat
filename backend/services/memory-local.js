// backend/services/memory-cloud.js
import 'dotenv/config'
import { MemoryClient } from 'mem0ai'

// Initialize Mem0 with cloud backend
const memory = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY,
  config: {
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
        
        const result = await this.memory.add(memoryData.content, { 
          user_id: 'chaidoc-user',
          metadata: memoryData.metadata
        })
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
      const results = await this.memory.search(query, { 
        limit,
        filters: {
          user_id: 'chaidoc-user'
        }
      })
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
      
      const results = await this.searchMemories(query, 20)
      
      // Filter by timestamp
      return results.filter(doc => 
        new Date(doc.metadata?.timestamp) >= cutoffTime &&
        doc.metadata?.type === 'document_chunk'
      )
    } catch (error) {
      console.error('[memory] Error getting recent documents:', error)
      // Return empty array instead of throwing to prevent RAG failures
      return []
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
      
      const result = await this.memory.add(interaction.content, { 
        user_id: 'chaidoc-user',
        metadata: interaction.metadata
      })
      return result
    } catch (error) {
      console.error('[memory] Error storing user interaction:', error)
      throw error
    }
  }

  // Get conversation context
  async getConversationContext(limit = 10) {
    try {
      const query = 'recent conversation context user interaction'
      const results = await this.memory.search(query, { 
        limit,
        filters: {
          user_id: 'chaidoc-user'
        }
      })
      
      return results.filter(doc => doc.metadata?.type === 'user_interaction')
    } catch (error) {
      console.error('[memory] Error getting conversation context:', error)
      // Return empty array instead of throwing to prevent RAG failures
      return []
    }
  }

  // Clear old memories (older than 30 days)
  async clearOldMemories(days = 30) {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      console.log(`[memory] Would clear memories older than ${cutoffTime.toISOString()}`)
      return { message: 'Old memories cleanup scheduled' }
    } catch (error) {
      console.error('[memory] Error clearing old memories:', error)
      throw error
    }
  }
}

export const documentMemory = new DocumentMemory()
