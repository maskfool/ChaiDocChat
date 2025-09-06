// backend/services/rag-enhanced.js - Enhanced RAG with better memory integration
import 'dotenv/config'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { similaritySearchFiltered, similaritySearch, getEmbeddings, similaritySearchWithEmbedding } from './vectorstore.js'
import { enhancedDocumentMemory } from './memory-enhanced.js'
import { getPersona } from '../personas.js'
import { pipeline } from '@xenova/transformers'
import { getChatModel, getModelInfo, getEmbeddingModel, getEmbeddingProvider } from './modelSelector.js'

const persona = getPersona('hitesh')

// Initialize text classifier for reranking
let textClassifier = null
async function getTextClassifier() {
  if (!textClassifier) {
    console.log('[rag-enhanced] Loading text classification model for reranking...')
    textClassifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english')
    console.log('[rag-enhanced] Text classifier loaded successfully')
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
    const hydeModel = getChatModel(query)
    const { text: hypotheticalDoc } = await generateText({
      model: hydeModel,
      prompt: `Given the following question, generate a hypothetical document that would contain the answer. Write it as if you are the document itself, using first person or neutral tone. Include specific details, dates, numbers, and facts that would be relevant to answering this question.

Question: ${query}

Hypothetical Document:`,
      temperature: 0.7,
      maxTokens: 500
    })
    
    console.log('[rag-enhanced] Generated HyDE document:', hypotheticalDoc.substring(0, 200) + '...')
    
    const hydeEmbedding = await getEmbeddings(hypotheticalDoc)
    console.log('[rag-enhanced] Generated HyDE embedding with dimension:', hydeEmbedding.length)
    
    return {
      document: hypotheticalDoc,
      embedding: hydeEmbedding
    }
  } catch (error) {
    console.error('[rag-enhanced] True HyDE generation failed:', error)
    return null
  }
}

// Search using HyDE embedding
async function searchWithHyDEEmbedding(hydeEmbedding, topK = 10) {
  try {
    console.log('[rag-enhanced] Searching with HyDE embedding...')
    const results = await similaritySearchWithEmbedding(hydeEmbedding, { 
      topK: Math.max(10, topK * 2), 
      minSimilarity: 0.6 
    })
    console.log(`[rag-enhanced] HyDE embedding search found ${results.length} documents`)
    return results
  } catch (error) {
    console.error('[rag-enhanced] HyDE embedding search failed:', error)
    return []
  }
}

// Text similarity reranking
async function rerankDocuments(query, documents, topK = 5) {
  try {
    const classifier = await getTextClassifier()
    const pairs = documents.map(doc => `${query} [SEP] ${(doc.pageContent || '').substring(0, 500)}`)
    const results = await classifier(pairs)
    
    const scoredDocs = documents.map((doc, index) => {
      const result = results[index]
      const relevanceScore = Array.isArray(result) 
        ? result.find(r => r.label === 'POSITIVE')?.score || 0.5
        : result.score || 0.5
      return {
        ...doc,
        relevanceScore
      }
    })
    
    scoredDocs.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    console.log(`[rag-enhanced] Reranked ${documents.length} documents, top scores:`, 
      scoredDocs.slice(0, 3).map(d => d.relevanceScore.toFixed(3)))
    
    return scoredDocs.slice(0, topK)
  } catch (error) {
    console.error('[rag-enhanced] Text classification reranking failed:', error)
    return documents.slice(0, topK)
  }
}

// Enhanced RAG with comprehensive memory integration
export async function answerFromDocsEnhanced(
  query,
  { 
    topK = Number(process.env.RAG_TOP_K || 5),
    useMemory = true,
    memoryOptions = {}
  } = {}
) {
  try {
    console.log(`[rag-enhanced] 🔍 Processing query: "${query}"`)
    
    // Special-case greeting
    if (isGreeting(query)) {
      return {
        answer: 'Hanjiii, kya madat karni hai aapki? 👨‍🏫 Kaise ho? Agar koi concept samajhna hai ya tumhare docs se koi sawaal hai, seedha pooch lo. Practice zaroor karna — ye cheez interview me kaam aayegi! 💪',
        context: [],
        persona: persona.name,
        sources: [],
        memoryUsed: false
      }
    }

    // Get comprehensive memory context
    let memoryContext = null
    if (useMemory) {
      console.log('[rag-enhanced] 🧠 Retrieving comprehensive memory context...')
      memoryContext = await enhancedDocumentMemory.getComprehensiveContext(query, {
        conversationLimit: 5,
        recentDocsHours: 24,
        relevantMemoriesLimit: 3,
        maxTotalTokens: 4000,
        ...memoryOptions
      })
      console.log(`[rag-enhanced] Memory context: ${memoryContext.totalItems} items`)
    }

    // True HyDE: Generate hypothetical document and embed it
    console.log('[rag-enhanced] 🧠 Generating True HyDE document and embedding...')
    const hydeResult = await generateHypotheticalDocumentEmbedding(query)
    
    // Search with original query
    console.log('[rag-enhanced] 🔍 Searching with original query...')
    let docs1 = await similaritySearchFiltered(query, { topK: Math.max(10, topK * 2), minSimilarity: 0.6 })
    
    // Search with HyDE embedding
    let docs2 = []
    if (hydeResult) {
      console.log('[rag-enhanced] 🔍 Searching with HyDE embedding...')
      docs2 = await searchWithHyDEEmbedding(hydeResult.embedding, topK * 2)
    } else {
      console.log('[rag-enhanced] ⚠️ HyDE failed, using original query for second search')
      docs2 = await similaritySearchFiltered(query, { topK: Math.max(10, topK * 2), minSimilarity: 0.6 })
    }
    
    // Combine and deduplicate results
    const allDocs = [...docs1, ...docs2]
    const uniqueDocs = allDocs.filter((doc, index, self) => 
      index === self.findIndex(d => d.pageContent === doc.pageContent)
    )
    
    console.log(`[rag-enhanced] Found ${uniqueDocs.length} unique documents before reranking`)
    
    // Rerank documents
    console.log('[rag-enhanced] 🎯 Reranking documents with text similarity...')
    const rerankedDocs = await rerankDocuments(query, uniqueDocs, topK)
    
    // Fallback if no relevant docs
    if (rerankedDocs.length === 0) {
      const fallbackAnswer = "Honestly, mujhe context me iska jawab nahi mila. Agar tum chaho to thoda aur detail do ya koi related document upload/paste karo, phir milke sahi se nikalte hain! 🙂"
      
      if (useMemory) {
        await enhancedDocumentMemory.storeUserInteraction(query, fallbackAnswer, {
          sources: [],
          chunksUsed: 0,
          hydeUsed: false,
          memoryUsed: true
        })
      }
      
      return {
        answer: fallbackAnswer,
        context: [],
        persona: persona.name,
        sources: [],
        memoryUsed: useMemory,
        memoryContext: memoryContext
      }
    }

    // Build comprehensive context
    const context = rerankedDocs
      .map((d, i) => {
        const src = d.metadata?.source ?? 'unknown'
        const page = d.metadata?.loc?.pageNumber ?? d.metadata?.page ?? ''
        const score = d.relevanceScore ? ` (relevance: ${d.relevanceScore.toFixed(3)})` : ''
        const label = page ? `${src}, p.${page}${score}` : `${src}${score}`
        return `# Source ${i + 1} (${label})\n${d.pageContent}`
      })
      .join('\n\n---\n\n')

    // Add memory context
    let memoryContextText = ''
    if (memoryContext && memoryContext.totalItems > 0) {
      memoryContextText = '\n\n--- Memory Context ---\n'
      
      if (memoryContext.conversation.length > 0) {
        memoryContextText += '\n## Recent Conversation:\n'
        memoryContextText += memoryContext.conversation.map((conv, i) => 
          `### Context ${i + 1}\n${conv.content}`
        ).join('\n\n')
      }
      
      if (memoryContext.recentDocuments.length > 0) {
        memoryContextText += '\n## Recent Documents:\n'
        memoryContextText += memoryContext.recentDocuments.map((doc, i) => 
          `### Recent Doc ${i + 1}\n${doc.content}`
        ).join('\n\n')
      }
      
      if (memoryContext.relevantMemories.length > 0) {
        memoryContextText += '\n## Relevant Memories:\n'
        memoryContextText += memoryContext.relevantMemories.map((mem, i) => 
          `### Memory ${i + 1}\n${mem.content}`
        ).join('\n\n')
      }
    }

    // Generate response
    const selectedModel = getChatModel(query)
    const modelInfo = getModelInfo(query)
    
    console.log(`[rag-enhanced] Using chat model: ${modelInfo.modelName} (${modelInfo.strategy})`)
    
    const { text } = await generateText({
      model: selectedModel,
      prompt: `${persona.style}

Always answer directly in Hinglish, without any opening greeting line.

Aapko sirf niche diye gaye "Context" ka use karke answer dena hai.
Agar context me jawab na ho, seedha batao ki context me nahi mila — guess mat karna.

IMPORTANT: 
1. Agar koi code example ya code snippet hai, to use proper markdown code blocks with language tags
2. Use markdown headings for better structure
3. Be VERY precise with dates, numbers, and specific facts from the context
4. Use memory context to provide more personalized and relevant answers

Question:
${query}

Context:
${context}${memoryContextText}`,
      temperature: 0.7,
      maxTokens: 1000
    })

    // Store interaction with enhanced metadata
    if (useMemory) {
      await enhancedDocumentMemory.storeUserInteraction(query, text, {
        sources: rerankedDocs.map(d => d.metadata?.source).filter(Boolean),
        chunksUsed: rerankedDocs.length,
        hydeUsed: true,
        memoryUsed: true,
        memoryItems: memoryContext?.totalItems || 0
      })
    }

    return {
      answer: text,
      context: rerankedDocs.map(d => ({ text: d.pageContent, metadata: d.metadata })),
      persona: persona.name,
      sources: [...new Set(rerankedDocs.map(d => d.metadata?.source).filter(Boolean))],
      memoryUsed: useMemory,
      memoryContext: memoryContext,
      hydeUsed: true,
      trueHydeUsed: hydeResult !== null,
      modelUsed: modelInfo.modelName,
      modelStrategy: modelInfo.strategy
    }

  } catch (error) {
    console.error('[rag-enhanced] Error:', error)
    return {
      answer: "Sorry, kuch technical issue aa raha hai. Thoda wait karo, phir try karo! 🔧",
      context: [],
      persona: persona.name,
      sources: [],
      memoryUsed: false
    }
  }
}

// Enhanced document indexing with memory storage
export async function indexDocumentWithMemoryEnhanced(chunks, metadata = {}) {
  try {
    // Store in vector database
    const { addDocuments } = await import('./vectorstore.js')
    await addDocuments(chunks)
    
    // Store in enhanced memory
    await enhancedDocumentMemory.storeDocumentChunks(chunks, metadata)
    
    return { success: true, chunksStored: chunks.length }
  } catch (error) {
    console.error('[rag-enhanced] Error indexing with memory:', error)
    throw error
  }
}
