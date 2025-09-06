// backend/services/rag.js - Enhanced with Mem0 memory, Vercel AI SDK, HyDE, Reranking, and Multi-Model Support
import 'dotenv/config'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { similaritySearchFiltered, similaritySearch, getEmbeddings, similaritySearchWithEmbedding } from './vectorstore.js'
import { SimpleDocumentMemory } from './memory-simple.js'
import { getPersona } from '../personas.js'
import { pipeline } from '@xenova/transformers'
import { getChatModel, getModelInfo, getEmbeddingModel, getEmbeddingProvider } from './modelSelector.js'

// Use model selector for consistent model selection
const persona = getPersona('hitesh')

// Initialize text classifier for reranking (using supported model)
let textClassifier = null
async function getTextClassifier() {
  if (!textClassifier) {
    console.log('[rag] Loading text classification model for reranking...')
    textClassifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
    console.log('[rag] Text classifier loaded successfully')
  }
  return textClassifier
}

function isGreeting(q) {
  const s = q.trim().toLowerCase()
  const words = ['hello', 'hi', 'hey', 'namaste', 'yo', 'hola', 'good morning', 'good evening', 'good afternoon']
  return words.some(w => s === w || s.startsWith(w) || s.includes(` ${w} `))
}

// True HyDE: Generate hypothetical document and embed it for vector search
async function generateHypotheticalDocumentEmbedding(query) {
  try {
    // Step 1: Generate hypothetical document using the selected model
    const hydeModel = getChatModel(query)
    const { text: hypotheticalDoc } = await generateText({
      model: hydeModel,
      prompt: `Given the following question, generate a hypothetical document that would contain the answer. Write it as if you are the document itself, using first person or neutral tone. Include specific details, dates, numbers, and facts that would be relevant to answering this question.

Question: ${query}

Hypothetical Document:`,
      temperature: 0.7,
      maxTokens: 500
    })
    
    console.log('[rag] Generated HyDE document:', hypotheticalDoc.substring(0, 200) + '...')
    
    // Step 2: Embed the hypothetical document using the same embedding model
    const hydeEmbedding = await getEmbeddings(hypotheticalDoc)
    
    console.log('[rag] Generated HyDE embedding with dimension:', hydeEmbedding.length)
    
    return {
      document: hypotheticalDoc,
      embedding: hydeEmbedding
    }
  } catch (error) {
    console.error('[rag] True HyDE generation failed:', error)
    return null // Fallback to original query
  }
}

// Search using HyDE embedding (True HyDE implementation)
async function searchWithHyDEEmbedding(hydeEmbedding, topK = 10, userId = null) {
  try {
    console.log('[rag] Searching with HyDE embedding...')
    const results = await similaritySearchWithEmbedding(hydeEmbedding, { 
      topK: Math.max(10, topK * 2), 
      minSimilarity: 0.6,
      userId
    })
    console.log(`[rag] HyDE embedding search found ${results.length} documents`)
    return results
  } catch (error) {
    console.error('[rag] HyDE embedding search failed:', error)
    return []
  }
}

// Text similarity reranking for better relevance
async function rerankDocuments(query, documents, topK = 5) {
  try {
    const classifier = await getTextClassifier()
    
    // Create query-document pairs for scoring
    const pairs = documents.map(doc => `${query} [SEP] ${(doc.pageContent || '').substring(0, 500)}`)
    
    // Get relevance scores using text classification
    const results = await classifier(pairs)
    
    // Combine documents with scores and sort
    const scoredDocs = documents.map((doc, index) => {
      const result = results[index]
      // Handle both single result and array of results
      const relevanceScore = Array.isArray(result) 
        ? result.find(r => r.label === 'POSITIVE')?.score || 0.5
        : result.score || 0.5
      return {
        ...doc,
        relevanceScore
      }
    })
    
    // Sort by relevance score (highest first)
    scoredDocs.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    console.log(`[rag] Reranked ${documents.length} documents, top scores:`, 
      scoredDocs.slice(0, 3).map(d => d.relevanceScore.toFixed(3)))
    
    return scoredDocs.slice(0, topK)
  } catch (error) {
    console.error('[rag] Text classification reranking failed:', error)
    return documents.slice(0, topK) // Fallback to original order
  }
}

export async function answerFromDocs(
  query,
  { topK = Number(process.env.RAG_TOP_K || 5), userId = null } = {}
) {
  try {
    console.log(`[rag] 🔍 Processing query: "${query}" for user: ${userId || 'default'}`)
    
    // Create user-specific memory instance
    const documentMemory = new SimpleDocumentMemory(userId)
    
    // 0) Special-case greeting → fixed Hitesh-style reply
    if (isGreeting(query)) {
      return {
        answer: 'Hanjiii, kya madat karni hai aapki? 👨‍🏫 Kaise ho? Agar koi concept samajhna hai ya tumhare docs se koi sawaal hai, seedha pooch lo. Practice zaroor karna — ye cheez interview me kaam aayegi! 💪',
        context: [],
        persona: persona.name,
        sources: []
      }
    }

    // 1) Get recent documents from memory (last 24 hours) - with error handling
    let recentDocs = []
    try {
      recentDocs = await documentMemory.getRecentDocuments(24)
    } catch (error) {
      console.warn('[rag] Memory error (recent docs):', error.message)
    }
    
    // 2) Get conversation context - with error handling
    let conversationContext = []
    try {
      conversationContext = await documentMemory.getConversationContext(5)
    } catch (error) {
      console.warn('[rag] Memory error (conversation):', error.message)
    }
    
    // 3) True HyDE: Generate hypothetical document and embed it
    console.log('[rag] 🧠 Generating True HyDE document and embedding...')
    const hydeResult = await generateHypotheticalDocumentEmbedding(query)
    
    // 4) Search with original query
    console.log('[rag] 🔍 Searching with original query...')
    let docs1 = await similaritySearchFiltered(query, { topK: Math.max(10, topK * 2), minSimilarity: 0.6, userId })
    
    // 5) Search with HyDE embedding (True HyDE)
    let docs2 = []
    if (hydeResult) {
      console.log('[rag] 🔍 Searching with HyDE embedding...')
      docs2 = await searchWithHyDEEmbedding(hydeResult.embedding, topK * 2, userId)
    } else {
      console.log('[rag] ⚠️ HyDE failed, using original query for second search')
      docs2 = await similaritySearchFiltered(query, { topK: Math.max(10, topK * 2), minSimilarity: 0.6, userId })
    }
    
    // 6) Combine and deduplicate results
    const allDocs = [...docs1, ...docs2]
    const uniqueDocs = allDocs.filter((doc, index, self) => 
      index === self.findIndex(d => d.pageContent === doc.pageContent)
    )
    
    console.log(`[rag] Found ${uniqueDocs.length} unique documents before reranking`)
    console.log(`[rag] Original query results: ${docs1.length}, HyDE results: ${docs2.length}`)
    
    // 7) Text similarity reranking for better relevance
    console.log('[rag] 🎯 Reranking documents with text similarity...')
    const rerankedDocs = await rerankDocuments(query, uniqueDocs, topK)
    
    // 8) If still nothing relevant, fallback
    if (rerankedDocs.length === 0) {
      const fallbackAnswer = "Honestly, mujhe context me iska jawab nahi mila. Agar tum chaho to thoda aur detail do ya koi related document upload/paste karo, phir milke sahi se nikalte hain! 🙂"
      
      // Store the interaction for future context
      try {
        await documentMemory.storeUserInteraction(query, fallbackAnswer)
      } catch (error) {
        console.warn('[rag] Memory error (storing interaction):', error.message)
      }
      
      return {
        answer: fallbackAnswer,
        context: [],
        persona: persona.name,
        sources: []
      }
    }

    // 9) Build comprehensive context with recent docs and conversation
    const context = rerankedDocs
      .map((d, i) => {
        const src = d.metadata?.source ?? 'unknown'
        const page = d.metadata?.loc?.pageNumber ?? d.metadata?.page ?? ''
        const url = d.metadata?.url ?? d.metadata?.source ?? ''
        const score = d.relevanceScore ? ` (relevance: ${d.relevanceScore.toFixed(3)})` : ''
        const label = page ? `${src}, p.${page}${score}` : `${src}${score}`
        const sourceInfo = url ? `\n\n**🔗 Source URL:** [${src}](${url})` : ''
        const pageInfo = page ? `\n**📄 Page:** ${page}` : ''
        return `# Source ${i + 1}: ${label}${sourceInfo}${pageInfo}\n\n${d.pageContent}`
      })
      .join('\n\n---\n\n')

    // Add recent documents context if available
    let recentContext = ''
    if (recentDocs.length > 0) {
      recentContext = '\n\n--- Recent Documents ---\n' + 
        recentDocs.map((doc, i) => `# Recent ${i + 1}\n${doc.content}`).join('\n\n')
    }

    // Add conversation context if available
    let conversationText = ''
    if (conversationContext.length > 0) {
      conversationText = '\n\n--- Previous Conversation ---\n' + 
        conversationContext.map((conv, i) => `# Context ${i + 1}\n${conv.content}`).join('\n\n')
    }

    // 10) Generate response using Vercel AI SDK with hybrid model selection
    const selectedModel = getChatModel(query)
    const modelInfo = getModelInfo(query)
    const embeddingModel = getEmbeddingModel()
    const embeddingProvider = getEmbeddingProvider()
    
    console.log(`[rag] Using chat model: ${modelInfo.modelName} (${modelInfo.strategy})`)
    console.log(`[rag] Using embedding model: ${embeddingModel} (${embeddingProvider})`)
    
    const { text } = await generateText({
      model: selectedModel,
      prompt: `${persona.style}

Always answer directly in Hinglish, without any opening greeting line.

Aapko sirf niche diye gaye "Context" ka use karke answer dena hai.
Agar context me jawab na ho, seedha batao ki context me nahi mila — guess mat karna.

IMPORTANT: 
1. Agar koi code example ya code snippet hai, to use proper markdown code blocks with language tags:
   - JavaScript: \`\`\`javascript
   - Python: \`\`\`python
   - JSON: \`\`\`json
   - SQL: \`\`\`sql
   - Bash: \`\`\`bash
   - HTML: \`\`\`html
   - CSS: \`\`\`css

2. Use markdown headings for better structure:
   - # Main Title (H1)
   - ## Section Title (H2)
   - ### Step Title (H3)
   - #### Sub-step (H4)

3. Be VERY precise with dates, numbers, and specific facts from the context.

4. **IMPORTANT**: Agar context me koi source URL hai, to answer ke end mein "Sources" section add karo:
   ## 📚 Sources
   - [Source Name](URL) - Description
   - [Another Source](URL) - Description

5. Agar koi specific document ya page reference hai, to mention karo ki "Aap [Document Name] ke page [X] pe dekh sakte hain"

6. **Source URLs ko highlight karo**: Agar context me koi URL hai, to use markdown links banake show karo

Question:
${query}

Context:
${context}${recentContext}${conversationText}`,
      temperature: 0.7,
      maxTokens: 1000
    })

    // 11) Store the interaction for future context - with error handling
    try {
      await documentMemory.storeUserInteraction(query, text, {
        sources: rerankedDocs.map(d => d.metadata?.source).filter(Boolean),
        chunksUsed: rerankedDocs.length,
        hydeUsed: true,
        crossEncoderUsed: true
      })
    } catch (error) {
      console.warn('[rag] Memory error (storing interaction):', error.message)
    }

    // Extract source URLs for better source information
    const sourceUrls = rerankedDocs
      .map(d => ({
        source: d.metadata?.source,
        url: d.metadata?.url || d.metadata?.source,
        page: d.metadata?.loc?.pageNumber || d.metadata?.page
      }))
      .filter(s => s.source)
      .reduce((acc, curr) => {
        if (!acc.find(s => s.source === curr.source)) {
          acc.push(curr)
        }
        return acc
      }, [])

    return {
      answer: text,
      context: rerankedDocs.map(d => ({ text: d.pageContent, metadata: d.metadata })),
      persona: persona.name,
      sources: [...new Set(rerankedDocs.map(d => d.metadata?.source).filter(Boolean))],
      sourceUrls: sourceUrls,
      recentDocs: recentDocs.length,
      conversationContext: conversationContext.length,
      hydeUsed: true,
      trueHydeUsed: hydeResult !== null,
      crossEncoderUsed: true,
      relevanceScores: rerankedDocs.map(d => d.relevanceScore).filter(Boolean),
      originalQueryResults: docs1.length,
      hydeResults: docs2.length,
      modelUsed: modelInfo.modelName,
      modelStrategy: modelInfo.strategy,
      embeddingModel: embeddingModel,
      embeddingProvider: embeddingProvider
    }

  } catch (error) {
    console.error('[rag] Error:', error)
    return {
      answer: "Sorry, kuch technical issue aa raha hai. Thoda wait karo, phir try karo! 🔧",
      context: [],
      persona: persona.name,
      sources: []
    }
  }
}

// Enhanced document indexing with memory storage
export async function indexDocumentWithMemory(chunks, metadata = {}) {
  try {
    // Store in vector database (existing functionality)
    const { addDocuments } = await import('./vectorstore.js')
    await addDocuments(chunks)
    
    // Store in memory for recent document tracking
    await documentMemory.storeDocumentChunks(chunks, metadata)
    
    return { success: true, chunksStored: chunks.length }
  } catch (error) {
    console.error('[rag] Error indexing with memory:', error)
    throw error
  }
}
