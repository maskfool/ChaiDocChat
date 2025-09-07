// src/api/services.js
import api from './client.js'

// Chat service with enhanced memory
export const chatService = {
  async askQuestion(query, options = {}) {
    const response = await api.post('/chat', { 
      query, 
      topK: options.topK 
    })
    return response.data
  },

  async getRecentDocuments(hours = 24) {
    const response = await api.get(`/documents/recent?hours=${hours}`)
    return response.data
  },

  async getConversationContext(limit = 10) {
    const response = await api.get(`/conversation/context?limit=${limit}`)
    return response.data
  }
}

// Document ingestion service
export const documentService = {
  async uploadFile(file) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await api.post("/ingest/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  async uploadText(text, source = 'pasted-text') {
    const response = await api.post("/ingest/text", { text, source })
    return response.data
  },

  async uploadUrl(url, options = {}) {
    const response = await api.post("/ingest/url", { 
      url, 
      depth: options.depth || 1,
      maxPages: options.maxPages || 10,
      enhanced: options.enhanced || false
    })
    return response.data
  },

  async uploadDocumentation(url, options = {}) {
    const response = await api.post("/ingest/documentation", { 
      url, 
      maxPages: options.maxPages || 100,
      maxDepth: options.maxDepth || 4
    })
    return response.data
  }
}

// Health check service
export const healthService = {
  async check() {
    const response = await api.get('/health')
    return response.data
  }
}
