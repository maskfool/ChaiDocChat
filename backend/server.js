import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import { indexFile, indexText, indexUrl } from './indexing.js'
import { answerFromDocs } from './services/rag.js'
import { getTypeFromPath } from './utils/filetype.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })
const upload = multer({ dest: uploadsDir }).single('file')

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/ingest/file', (req, res) => {
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

app.post('/api/ingest/text', async (req, res) => {
  try {
    const { text, source } = req.body || {}
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' })
    const result = await indexText(text, { source: source || 'pasted-text' })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.post('/api/ingest/url', async (req, res) => {
  try {
    const { url, depth = 1, maxPages = 10 } = req.body || {}
    if (!url) return res.status(400).json({ success: false, error: 'No url provided' })
    const result = await indexUrl(url, { depth: Number(depth), maxPages: Number(maxPages) })
    res.json({ success: true, ...result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { query, topK } = req.body || {}
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'query is required (string)' })
    }
    const result = await answerFromDocs(query, { topK: topK ? Number(topK) : undefined })
    res.json({ success: true, answer: result.answer, persona: result.persona })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`)
})
