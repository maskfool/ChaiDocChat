// backend/routes/api.js
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { indexFile, indexText, indexUrl, indexDocumentationSite } from '../indexing.js'
import { answerFromDocs } from '../services/rag-optimized.js'
import { getTypeFromPath } from '../utils/filetype.js'

const router = express.Router()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '../uploads')
fs.mkdirSync(uploadsDir, { recursive: true })
const upload = multer({ dest: uploadsDir }).single('file')

// Health check
router.get('/health', (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }))

// File upload endpoint
router.post('/ingest/file', (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) throw err
      if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' })
      
      const filePath = req.file.path
      const originalName = req.file.originalname
      const explicitType = getTypeFromPath(originalName)
      const result = await indexFile(filePath, explicitType)
      
      res.json({ success: true, ...result })
    } catch (e) {
      res.status(500).json({ success: false, error: e.message })
    }
  })
})

// Text ingestion endpoint
router.post('/ingest/text', async (req, res) => {
  try {
    const { text, source } = req.body || {}
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' })
    
    const result = await indexText(text, { source: source || 'pasted-text' })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// URL ingestion endpoint
router.post('/ingest/url', async (req, res) => {
  try {
    const { url, depth = 1, maxPages = 10, enhanced = false } = req.body || {}
    if (!url) return res.status(400).json({ success: false, error: 'No url provided' })
    
    const result = await indexUrl(url, { 
      depth: Number(depth), 
      maxPages: Number(maxPages),
      enhanced: Boolean(enhanced)
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Documentation site ingestion endpoint
router.post('/ingest/documentation', async (req, res) => {
  try {
    const { url, maxPages = 100, maxDepth = 4 } = req.body || {}
    if (!url) return res.status(400).json({ success: false, error: 'No url provided' })
    
    const result = await indexDocumentationSite(url, { 
      maxPages: Number(maxPages), 
      maxDepth: Number(maxDepth)
    })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Chat endpoint with enhanced memory
router.post('/chat', async (req, res) => {
  try {
    const { query, topK } = req.body || {}
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'query is required (string)' })
    }
    
    const result = await answerFromDocs(query, { topK: topK ? Number(topK) : undefined })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Get recent documents
router.get('/documents/recent', async (req, res) => {
  try {
    const { hours = 24 } = req.query
    const { documentMemory } = await import('../services/memory.js')
    const recentDocs = await documentMemory.getRecentDocuments(Number(hours))
    res.json({ success: true, documents: recentDocs })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// Get conversation context
router.get('/conversation/context', async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const { documentMemory } = await import('../services/memory.js')
    const context = await documentMemory.getConversationContext(Number(limit))
    res.json({ success: true, context })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

export default router
