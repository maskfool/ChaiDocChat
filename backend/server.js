import express from 'express'
import cors from 'cors'
import multer from 'multer'
import compression from 'compression'
import morgan from 'morgan'
import path from 'node:path'
import fs from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// Import configuration and middleware
import { config } from './config/env.js'
import logger from './config/logger.js'
import { 
  securityHeaders, 
  apiRateLimit, 
  uploadRateLimit, 
  chatRateLimit,
  requestSizeLimit,
  corsOptions,
  securityLogger 
} from './middleware/security.js'
import { 
  validateFileUpload, 
  validateTextContent, 
  validateUrl, 
  validateChatMessage,
  sanitizeInput 
} from './middleware/validation.js'

// Import services
import { indexFile, indexText, indexUrl, indexDocumentationSite } from './indexing.js'
import { answerFromDocs } from './services/rag.js'
import { getTypeFromPath } from './utils/filetype.js'
import { authenticateUser } from './middleware/auth.js'
import { connectToDatabase, checkDatabaseHealth } from './config/database.js'
import { Document } from './models/Document.js'
import { Conversation } from './models/Conversation.js'

const app = express()

// Initialize database connection
connectToDatabase().catch(logger.error)

// Security middleware (order matters!)
app.use(securityHeaders)
app.use(compression())
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))
app.use(securityLogger)
app.use(cors(corsOptions))
app.use(requestSizeLimit)
app.use(sanitizeInput)

// Body parsing with limits
app.use(express.json({ 
  limit: `${config.upload.maxFileSize / 1024 / 1024}mb`,
  verify: (req, res, buf) => {
    req.rawBody = buf
  }
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: `${config.upload.maxFileSize / 1024 / 1024}mb` 
}))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// Configure multer with file size limits
const upload = multer({ 
  dest: uploadsDir,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'), false)
    }
  }
}).single('file')

// API versioning
const API_VERSION = 'v1'
const API_PREFIX = `/api/${API_VERSION}`

// Health check with database status
app.get('/api/health', async (_req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth()
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      database: dbHealth,
      uptime: process.uptime()
    })
  } catch (error) {
    logger.error('Health check failed:', error)
    res.status(503).json({ 
      ok: false, 
      error: 'Service unavailable',
      timestamp: new Date().toISOString()
    })
  }
})

app.post(`${API_PREFIX}/ingest/file`, apiRateLimit, uploadRateLimit, authenticateUser, validateFileUpload, (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) throw err
      if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
      
      const filePath = req.file.path
      const originalName = req.file.originalname
      const explicitType = getTypeFromPath(originalName)
      
      // Index the file with user context
      const result = await indexFile(filePath, explicitType, req.user.clerkUserId)
      
      // Save document metadata to database
      const document = await Document.create({
        userId: req.user.clerkUserId,
        fileName: originalName,
        fileType: explicitType,
        filePath: filePath,
        fileSize: req.file.size,
        source: 'file',
        chunksIndexed: result.chunksIndexed || 0
      })
      
      res.json({ 
        success: true, 
        ...result,
        documentId: document._id
      })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
})

app.post(`${API_PREFIX}/ingest/text`, apiRateLimit, authenticateUser, validateTextContent, async (req, res) => {
  try {
    const { text, source } = req.body || {}
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' })
    
    // Index the text with user context
    const result = await indexText(text, { 
      source: source || 'pasted-text',
      userId: req.user.clerkUserId 
    })
    
    // Save document metadata to database
    const document = await Document.create({
      userId: req.user.clerkUserId,
      fileName: `Text snippet - ${new Date().toLocaleString()}`,
      fileType: 'text',
      filePath: null,
      fileSize: text.length,
      source: 'text',
      chunksIndexed: result.chunksIndexed || 0
    })
    
    res.json({ 
      success: true, 
      ...result,
      documentId: document._id
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.post(`${API_PREFIX}/ingest/url`, apiRateLimit, authenticateUser, validateUrl, async (req, res) => {
  try {
    const { url, depth = 1, maxPages = 10, enhanced = false } = req.body || {}
    if (!url) return res.status(400).json({ success: false, error: 'No url provided' })
    
    // Index the URL with user context
    const result = await indexUrl(url, { 
      depth: Number(depth), 
      maxPages: Number(maxPages),
      enhanced: Boolean(enhanced),
      userId: req.user.clerkUserId
    })
    
    // Save document metadata to database
    const document = await Document.create({
      userId: req.user.clerkUserId,
      fileName: url,
      fileType: 'url',
      filePath: null,
      fileSize: 0,
      source: 'url',
      originalUrl: url,
      chunksIndexed: result.chunksIndexed || 0
    })
    
    res.json({ 
      success: true, 
      ...result,
      documentId: document._id
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Documentation site ingestion endpoint
app.post(`${API_PREFIX}/ingest/documentation`, apiRateLimit, authenticateUser, validateUrl, async (req, res) => {
  try {
    const { url, maxPages = 100, maxDepth = 4 } = req.body || {}
    if (!url) return res.status(400).json({ success: false, error: 'No url provided' })
    
    // Index the documentation site with user context
    const result = await indexDocumentationSite(url, { 
      maxPages: Number(maxPages), 
      maxDepth: Number(maxDepth),
      userId: req.user.clerkUserId
    })
    
    // Save document metadata to database
    const document = await Document.create({
      userId: req.user.clerkUserId,
      fileName: `Documentation: ${url}`,
      fileType: 'documentation',
      filePath: null,
      fileSize: 0,
      source: 'documentation',
      originalUrl: url,
      chunksIndexed: result.chunksIndexed || 0
    })
    
    res.json({ 
      success: true, 
      ...result,
      documentId: document._id
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Chat endpoint with enhanced memory
app.post(`${API_PREFIX}/chat`, chatRateLimit, authenticateUser, validateChatMessage, async (req, res) => {
  try {
    const { query, topK } = req.body || {}
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'query is required (string)' })
    }
    
    // Get or create active conversation
    let conversation = await Conversation.findActiveConversation(req.user.clerkUserId)
    if (!conversation) {
      conversation = await Conversation.create({
        userId: req.user.clerkUserId,
        title: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
        messages: []
      })
    }
    
    // Add user message to conversation
    await Conversation.addMessage(conversation._id, req.user.clerkUserId, {
      role: 'user',
      content: query,
      timestamp: new Date()
    })
    
    // Get answer with user context
    const result = await answerFromDocs(query, { 
      topK: topK ? Number(topK) : undefined,
      userId: req.user.clerkUserId
    })
    
    // Add assistant response to conversation
    await Conversation.addMessage(conversation._id, req.user.clerkUserId, {
      role: 'assistant',
      content: result.answer,
      sources: result.sources || [],
      timestamp: new Date()
    })
    
    res.json({ 
      success: true, 
      ...result,
      conversationId: conversation._id
    })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Get recent documents
app.get(`${API_PREFIX}/documents/recent`, apiRateLimit, authenticateUser, async (req, res) => {
  try {
    const { hours = 24 } = req.query
    const recentDocs = await Document.getRecentDocuments(req.user.clerkUserId, Number(hours))
    res.json({ success: true, documents: recentDocs })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Get conversation context
app.get(`${API_PREFIX}/conversation/context`, apiRateLimit, authenticateUser, async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const conversations = await Conversation.getRecentConversations(req.user.clerkUserId, Number(limit))
    res.json({ success: true, conversations })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Get user documents
app.get(`${API_PREFIX}/documents`, apiRateLimit, authenticateUser, async (req, res) => {
  try {
    const { source, limit = 50 } = req.query
    let documents
    
    if (source) {
      documents = await Document.findByUserIdAndSource(req.user.clerkUserId, source, Number(limit))
    } else {
      documents = await Document.findByUserId(req.user.clerkUserId, Number(limit))
    }
    
    res.json({ success: true, documents })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Get user conversations
app.get(`${API_PREFIX}/conversations`, apiRateLimit, authenticateUser, async (req, res) => {
  try {
    const { limit = 50 } = req.query
    const conversations = await Conversation.findByUserId(req.user.clerkUserId, Number(limit))
    res.json({ success: true, conversations })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Test endpoint for model comparison
app.post(`${API_PREFIX}/test/models`, apiRateLimit, authenticateUser, async (req, res) => {
  try {
    const { query = "What is the AI SDK?" } = req.body
    const { testModels } = await import('./services/modelSelector.js')
    const { generateText } = await import('ai')
    
    const results = await testModels(query, async (model) => {
      const { text } = await generateText({
        model,
        prompt: `Answer this question briefly: ${query}`,
        maxTokens: 100
      })
      return text
    })
    
    res.json({ success: true, query, results })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Model configuration endpoint
app.get(`${API_PREFIX}/models/config`, apiRateLimit, authenticateUser, async (req, res) => {
  try {
    const { CONFIG } = await import('./services/modelSelector.js')
    res.json({ success: true, config: CONFIG })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'DocChat API - Optimized with Mem0 & Vercel AI SDK',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat',
      upload: '/api/ingest/file',
      text: '/api/ingest/text',
      url: '/api/ingest/url',
      documentation: '/api/ingest/documentation',
      recent: '/api/documents/recent',
      context: '/api/conversation/context'
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  })
})

// Global error handler
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.clerkUserId || 'anonymous'
  })
  
  // Don't leak error details in production
  const isDevelopment = config.env === 'development'
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      `POST ${API_PREFIX}/ingest/file`,
      `POST ${API_PREFIX}/ingest/text`,
      `POST ${API_PREFIX}/ingest/url`,
      `POST ${API_PREFIX}/ingest/documentation`,
      `POST ${API_PREFIX}/chat`,
      `GET ${API_PREFIX}/documents`,
      `GET ${API_PREFIX}/conversations`
    ]
  })
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully')
  process.exit(0)
})

// Start server
const PORT = config.port
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`)
  logger.info(`📊 Environment: ${config.env}`)
  logger.info(`🔒 Security features enabled`)
  logger.info(`📝 Logging level: ${config.logging.level}`)
})
