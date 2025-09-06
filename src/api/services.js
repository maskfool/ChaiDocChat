// src/api/services.js
import api from './client.js'

// Chat service with enhanced memory
export const chatService = {
  async askQuestion(query, options = {}) {
    const response = await api.post('/api/chat', { 
      query, 
      topK: options.topK 
    })
    return response.data
  },

  async getRecentDocuments(hours = 24) {
    const response = await api.get(`/api/documents/recent?hours=${hours}`)
    return response.data
  },

  async getConversationContext(limit = 10) {
    const response = await api.get(`/api/conversation/context?limit=${limit}`)
    return response.data
  }
}

// Document ingestion service
export const documentService = {
  async uploadFile(file) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await api.post("/api/ingest/file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return response.data
  },

  async uploadText(text, source = 'pasted-text') {
    const response = await api.post("/api/ingest/text", { text, source })
    return response.data
  },

  async uploadUrl(url, options = {}) {
    const response = await api.post("/api/ingest/url", { 
      url, 
      depth: options.depth || 1,
      maxPages: options.maxPages || 10,
      enhanced: options.enhanced || false
    })
    return response.data
  },

  async uploadDocumentation(url, options = {}) {
    const response = await api.post("/api/ingest/documentation", { 
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
    const response = await api.get('/api/health')
    return response.data
  }
}
