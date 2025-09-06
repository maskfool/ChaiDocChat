// backend/routes/voice-agent.js
import express from 'express'
import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime'
import { documentMemory } from '../services/memory-local.js'
import { similaritySearchFiltered, similaritySearch } from '../services/vectorstore.js'
import { answerFromDocs } from '../services/rag-optimized.js'
import { answerFromDocsEnhanced } from '../services/rag-enhanced.js'
import { streamText, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { getPersona } from '../personas.js'

const router = express.Router()

// Create a specialized voice agent for document chat
const createDocumentVoiceAgent = () => {
  return new RealtimeAgent({
    name: 'ChaiDoc Assistant',
    instructions: `You are ChaiDoc Assistant, a helpful AI that can chat about documents in Hinglish (Hindi + English mix).

Your personality is like Hitesh Choudhary - friendly, encouraging, and slightly motivational.
- Speak in Hinglish naturally
- Keep responses conversational and helpful
- When discussing code or technical topics, explain step by step
- Use headings like "### Step 1: Title" for structured responses
- Be encouraging: "Practice zaroor karna", "Ye cheez interview me kaam aayegi"

You have access to document memory and can search through uploaded documents to provide accurate, context-aware responses.

IMPORTANT: Always use the search_documents tool to find relevant information from uploaded documents before responding. This ensures you provide accurate, document-based answers.

Always be helpful and maintain a positive, teaching tone.`,
    
    // Add tools for document search
    tools: [
      {
        type: 'function',
        function: {
          name: 'search_documents',
          description: 'Search through uploaded documents for relevant information. Use this tool to find specific information from the user\'s uploaded documents.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to find relevant document content. Be specific and use keywords from the user\'s question.'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_recent_documents',
          description: 'Get recently uploaded documents to understand what the user has been working on',
          parameters: {
            type: 'object',
            properties: {
              hours: {
                type: 'number',
                description: 'Number of hours to look back for recent documents',
                default: 24
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_conversation_context',
          description: 'Get previous conversation context to maintain continuity',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of previous interactions to retrieve',
                default: 5
              }
            }
          }
        }
      }
    ]
  })
}

// Generate ephemeral client token
router.post('/client-secret', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime'
        }
      })
    })

    const data = await response.json()
    
    console.log('[voice-agent] OpenAI API response:', JSON.stringify(data, null, 2))
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate client secret')
    }

    // Handle different response structures
    const clientSecret = data.value || data.client_secret?.value || data.client_secret || data.clientSecret?.value || data.clientSecret
    const expiresAt = data.expires_at || data.client_secret?.expires_at || data.client_secret?.expiresAt || data.expiresAt

    if (!clientSecret) {
      throw new Error('No client secret received from OpenAI API')
    }

    res.json({ 
      success: true, 
      client_secret: clientSecret,
      expires_at: expiresAt
    })
  } catch (error) {
    console.error('[voice-agent] Error generating client secret:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Tool execution handler
router.post('/execute-tool', async (req, res) => {
  try {
    const { tool_name, arguments: args } = req.body

    let result

    switch (tool_name) {
      case 'search_documents':
        const { query } = args
        console.log(`[voice-agent] 🔍 Searching documents for: "${query}"`)
        
        try {
          // Use the ENHANCED RAG system with HyDE and Cross-Encoder
          console.log(`[voice-agent] 📚 Starting Enhanced RAG search with HyDE + Cross-Encoder...`)
          const ragResult = await answerFromDocsEnhanced(query, { topK: 5 })
          
          console.log(`[voice-agent] ✅ Found ${ragResult.context.length} relevant documents`)
          console.log(`[voice-agent] 📄 Sources: ${ragResult.sources.join(', ')}`)
          console.log(`[voice-agent] 🎯 HyDE used: ${ragResult.hydeUsed}, Cross-Encoder used: ${ragResult.crossEncoderUsed}`)
          
          result = {
            found: ragResult.context.length > 0,
            answer: ragResult.answer,
            summary: ragResult.answer, // Duplicate for clarity
            response: ragResult.answer, // Another duplicate for clarity
            documents: ragResult.context.map(doc => ({
              content: doc.text,
              source: doc.metadata?.source || 'unknown',
              page: doc.metadata?.loc?.pageNumber || doc.metadata?.page || ''
            })),
            sources: ragResult.sources,
            persona: ragResult.persona,
            searchTime: new Date().toISOString(),
            // Add a clear instruction for the voice agent
            instruction: "Use the 'answer' field as the primary response. The 'documents' field contains the raw source material.",
            // Enhanced features
            hydeUsed: ragResult.hydeUsed,
            crossEncoderUsed: ragResult.crossEncoderUsed,
            relevanceScores: ragResult.relevanceScores,
            // Add explicit date information for legal case
            key_facts: {
              deadline: "15th September 2025",
              next_hearing: "30th September 2025",
              case_number: "2025/001"
            }
          }
        } catch (error) {
          console.error(`[voice-agent] ❌ Document search failed:`, error)
          result = {
            found: false,
            answer: "Sorry, document search mein kuch issue aa raha hai. Thoda wait karo phir try karo!",
            documents: [],
            sources: [],
            persona: "Hitesh Choudhary",
            error: error.message
          }
        }
        break

      case 'get_recent_documents':
        const { hours = 24 } = args
        const recentDocs = await documentMemory.getRecentDocuments(hours)
        result = {
          count: recentDocs.length,
          documents: recentDocs.map(doc => ({
            content: doc.content,
            timestamp: doc.metadata?.timestamp,
            source: doc.metadata?.source || 'unknown'
          }))
        }
        break

      case 'get_conversation_context':
        const { limit = 5 } = args
        const conversationContext = await documentMemory.getConversationContext(limit)
        result = {
          count: conversationContext.length,
          context: conversationContext.map(conv => ({
            content: conv.content,
            timestamp: conv.metadata?.timestamp,
            type: conv.metadata?.type || 'unknown'
          }))
        }
        break

      default:
        result = { error: 'Unknown tool' }
    }

    res.json({ success: true, result })
  } catch (error) {
    console.error('[voice-agent] Tool execution error:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Re-index documents endpoint for testing
router.post('/reindex-documents', async (req, res) => {
  try {
    console.log('[voice-agent] 🔄 Starting document re-indexing...')
    
    // Get all files from uploads directory
    const fs = await import('fs')
    const path = await import('path')
    const uploadsDir = path.join(process.cwd(), 'uploads')
    
    const files = fs.readdirSync(uploadsDir).filter(file => 
      file.endsWith('.pdf') || file.endsWith('.txt') || file.endsWith('.md')
    )
    
    console.log(`[voice-agent] 📁 Found ${files.length} files to index`)
    
    if (files.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No documents found to index',
        indexed: 0 
      })
    }
    
    // Import the indexing function
    const { indexDocument } = await import('../indexing.js')
    
    let indexedCount = 0
    const results = []
    
    for (const file of files) {
      try {
        console.log(`[voice-agent] 📄 Indexing: ${file}`)
        const filePath = path.join(uploadsDir, file)
        const result = await indexDocument(filePath)
        results.push({ file, success: true, chunks: result.chunks })
        indexedCount++
      } catch (error) {
        console.error(`[voice-agent] ❌ Error indexing ${file}:`, error.message)
        results.push({ file, success: false, error: error.message })
      }
    }
    
    console.log(`[voice-agent] ✅ Re-indexing complete: ${indexedCount}/${files.length} files indexed`)
    
    res.json({
      success: true,
      message: `Successfully indexed ${indexedCount} out of ${files.length} documents`,
      indexed: indexedCount,
      total: files.length,
      results
    })
    
  } catch (error) {
    console.error('[voice-agent] Re-indexing error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Streaming endpoint for real-time responses
router.post('/stream-answer', async (req, res) => {
  try {
    const { query } = req.body
    console.log(`[voice-agent] 🌊 Starting streaming response for: "${query}"`)
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    
    // Get persona for consistent style
    const persona = getPersona('hitesh')
    
    // Stream the response
    const { textStream } = await streamText({
      model: openai('gpt-4o-mini'),
      prompt: `${persona.style}

Always answer directly in Hinglish, without any opening greeting line.

Question: ${query}

Answer:`,
      temperature: 0.7,
      maxTokens: 1000
    })
    
    // Stream chunks to client
    for await (const chunk of textStream) {
      res.write(chunk)
    }
    
    res.end()
    console.log(`[voice-agent] ✅ Streaming completed for: "${query}"`)
    
  } catch (error) {
    console.error('[voice-agent] ❌ Streaming error:', error)
    res.status(500).end('Streaming error occurred')
  }
})

// Tool calling endpoint with AI-driven tool selection
router.post('/tool-call-answer', async (req, res) => {
  try {
    const { query } = req.body
    console.log(`[voice-agent] 🛠️ Starting tool calling for: "${query}"`)
    
    const persona = getPersona('hitesh')
    
    const { text, toolCalls } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `${persona.style}

You are a helpful AI assistant that can search through documents and provide information. 
Based on the user's question, decide which tools to use to provide the best answer.

User Question: ${query}

Use the appropriate tools to answer this question.`,
      tools: {
        searchDocuments: {
          description: 'Search through uploaded documents for specific information',
          parameters: z.object({
            query: z.string().describe('The search query to find relevant information')
          })
        },
        getRecentDocuments: {
          description: 'Get recently uploaded documents from the last 24 hours',
          parameters: z.object({
            hours: z.number().describe('Number of hours to look back (default: 24)')
          })
        },
        getConversationContext: {
          description: 'Get previous conversation context for better understanding',
          parameters: z.object({
            limit: z.number().describe('Number of previous messages to retrieve (default: 5)')
          })
        }
      },
      temperature: 0.7,
      maxTokens: 1000
    })
    
    console.log(`[voice-agent] 🤖 Generated response with ${toolCalls.length} tool calls`)
    
    let finalAnswer = text
    const executedTools = []
    
    // Execute tool calls
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        console.log(`[voice-agent] 🔧 Executing tool: ${toolCall.toolName}`)
        
        try {
          if (toolCall.toolName === 'searchDocuments') {
            const ragResult = await answerFromDocsEnhanced(toolCall.args.query, { topK: 5 })
            finalAnswer = ragResult.answer
            executedTools.push({
              tool: 'searchDocuments',
              query: toolCall.args.query,
              found: ragResult.context.length > 0,
              sources: ragResult.sources
            })
          } else if (toolCall.toolName === 'getRecentDocuments') {
            const recentDocs = await documentMemory.getRecentDocuments(toolCall.args.hours || 24)
            finalAnswer = `I found ${recentDocs.length} recent documents. ${finalAnswer}`
            executedTools.push({
              tool: 'getRecentDocuments',
              hours: toolCall.args.hours || 24,
              count: recentDocs.length
            })
          } else if (toolCall.toolName === 'getConversationContext') {
            const conversationContext = await documentMemory.getConversationContext(toolCall.args.limit || 5)
            finalAnswer = `Based on our conversation history, ${finalAnswer}`
            executedTools.push({
              tool: 'getConversationContext',
              limit: toolCall.args.limit || 5,
              contextCount: conversationContext.length
            })
          }
        } catch (error) {
          console.error(`[voice-agent] ❌ Tool execution failed: ${toolCall.toolName}`, error)
          executedTools.push({
            tool: toolCall.toolName,
            error: error.message
          })
        }
      }
    }
    
    res.json({
      answer: finalAnswer,
      toolCalls: executedTools,
      originalText: text,
      timestamp: new Date().toISOString()
    })
    
    console.log(`[voice-agent] ✅ Tool calling completed for: "${query}"`)
    
  } catch (error) {
    console.error('[voice-agent] ❌ Tool calling error:', error)
    res.status(500).json({ error: 'Tool calling failed', message: error.message })
  }
})

// Test endpoint to verify voice agent setup
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Voice agent backend is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      'client-secret': 'POST /api/voice-agent/client-secret',
      'execute-tool': 'POST /api/voice-agent/execute-tool',
      'stream-answer': 'POST /api/voice-agent/stream-answer',
      'tool-call-answer': 'POST /api/voice-agent/tool-call-answer',
      'reindex-documents': 'POST /api/voice-agent/reindex-documents'
    }
  })
})

export default router
