// backend/services/memory-enhanced.js - Enhanced Mem0 with better context window management
import 'dotenv/config'
import { MemoryClient } from 'mem0ai'

// Initialize Mem0 with enhanced configuration
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

export class EnhancedDocumentMemory {
  constructor() {
    this.memory = memory
    this.maxContextLength = 4000 // Maximum context length in tokens
    this.maxConversationHistory = 20 // Maximum conversation history to keep
  }

  // Store document chunks with enhanced metadata
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
            type: 'document_chunk',
            chunk_id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
      console.error('[memory-enhanced] Error storing document chunks:', error)
      throw error
    }
  }

  // Store user interaction with enhanced context
  async storeUserInteraction(query, response, metadata = {}) {
    try {
      const interaction = {
        content: `User: "${query}"\nAssistant: "${response}"`,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          type: 'user_interaction',
          query_length: query.length,
          response_length: response.length,
          session_id: metadata.session_id || 'default'
        }
      }
      
      const result = await this.memory.add(interaction.content, { 
        user_id: 'chaidoc-user',
        metadata: interaction.metadata
      })
      return result
    } catch (error) {
      console.error('[memory-enhanced] Error storing user interaction:', error)
      throw error
    }
  }

  // Get conversation context with smart truncation
  async getConversationContext(limit = 10, maxTokens = 2000) {
    try {
      const query = 'recent conversation context user interaction'
      const results = await this.memory.search(query, { 
        limit: limit * 2, // Get more to filter
        filters: {
          user_id: 'chaidoc-user',
          metadata: {
            type: 'user_interaction'
          }
        }
      })
      
      // Sort by timestamp (most recent first)
      const sortedResults = results
        .filter(doc => doc.metadata?.type === 'user_interaction')
        .sort((a, b) => new Date(b.metadata?.timestamp) - new Date(a.metadata?.timestamp))
        .slice(0, limit)

      // Truncate if too long
      let totalLength = 0
      const truncatedResults = []
      
      for (const result of sortedResults) {
        const contentLength = result.content?.length || 0
        if (totalLength + contentLength <= maxTokens) {
          truncatedResults.push(result)
          totalLength += contentLength
        } else {
          break
        }
      }

      console.log(`[memory-enhanced] Retrieved ${truncatedResults.length} conversation contexts (${totalLength} chars)`)
      return truncatedResults
    } catch (error) {
      console.error('[memory-enhanced] Error getting conversation context:', error)
      return []
    }
  }

  // Get recent documents with smart filtering
  async getRecentDocuments(hours = 24, maxTokens = 2000) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
      const query = `Find documents uploaded after ${cutoffTime.toISOString()}`
      
      const results = await this.memory.search(query, { 
        limit: 20,
        filters: {
          user_id: 'chaidoc-user',
          metadata: {
            type: 'document_chunk',
            timestamp: { $gte: cutoffTime.toISOString() }
          }
        }
      })
      
      // Truncate if too long
      let totalLength = 0
      const truncatedResults = []
      
      for (const result of results) {
        const contentLength = result.content?.length || 0
        if (totalLength + contentLength <= maxTokens) {
          truncatedResults.push(result)
          totalLength += contentLength
        } else {
          break
        }
      }

      console.log(`[memory-enhanced] Retrieved ${truncatedResults.length} recent documents (${totalLength} chars)`)
      return truncatedResults
    } catch (error) {
      console.error('[memory-enhanced] Error getting recent documents:', error)
      return []
    }
  }

  // Get relevant memories for a specific query
  async getRelevantMemories(query, limit = 5, maxTokens = 1000) {
    try {
      const results = await this.memory.search(query, { 
        limit: limit * 2,
        filters: {
          user_id: 'chaidoc-user'
        }
      })
      
      // Truncate if too long
      let totalLength = 0
      const truncatedResults = []
      
      for (const result of results) {
        const contentLength = result.content?.length || 0
        if (totalLength + contentLength <= maxTokens) {
          truncatedResults.push(result)
          totalLength += contentLength
        } else {
          break
        }
      }

      console.log(`[memory-enhanced] Retrieved ${truncatedResults.length} relevant memories (${totalLength} chars)`)
      return truncatedResults
    } catch (error) {
      console.error('[memory-enhanced] Error getting relevant memories:', error)
      return []
    }
  }

  // Get comprehensive context for RAG
  async getComprehensiveContext(query, options = {}) {
    const {
      conversationLimit = 5,
      recentDocsHours = 24,
      relevantMemoriesLimit = 3,
      maxTotalTokens = 4000
    } = options

    try {
      // Get different types of context in parallel
      const [conversationContext, recentDocs, relevantMemories] = await Promise.all([
        this.getConversationContext(conversationLimit, maxTotalTokens * 0.3),
        this.getRecentDocuments(recentDocsHours, maxTotalTokens * 0.4),
        this.getRelevantMemories(query, relevantMemoriesLimit, maxTotalTokens * 0.3)
      ])

      const context = {
        conversation: conversationContext,
        recentDocuments: recentDocs,
        relevantMemories: relevantMemories,
        totalItems: conversationContext.length + recentDocs.length + relevantMemories.length
      }

      console.log(`[memory-enhanced] Comprehensive context: ${context.totalItems} items`)
      return context
    } catch (error) {
      console.error('[memory-enhanced] Error getting comprehensive context:', error)
      return {
        conversation: [],
        recentDocuments: [],
        relevantMemories: [],
        totalItems: 0
      }
    }
  }

  // Clear old memories
  async clearOldMemories(days = 30) {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      console.log(`[memory-enhanced] Would clear memories older than ${cutoffTime.toISOString()}`)
      return { message: 'Old memories cleanup scheduled' }
    } catch (error) {
      console.error('[memory-enhanced] Error clearing old memories:', error)
      throw error
    }
  }

  // Get memory statistics
  async getMemoryStats() {
    try {
      const stats = await this.memory.getStats()
      return stats
    } catch (error) {
      console.error('[memory-enhanced] Error getting memory stats:', error)
      return { error: error.message }
    }
  }
}

export const enhancedDocumentMemory = new EnhancedDocumentMemory()
