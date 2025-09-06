// backend/services/modelSelector.js - OpenAI-only model selection
import 'dotenv/config'
import { openai } from '@ai-sdk/openai'

// Model configurations - OpenAI only (optimized for best performance)
const MODELS = {
  'gpt-4.1': () => openai('gpt-4.1'),
  'gpt-4o': () => openai('gpt-4o'),
  'gpt-4o-mini': () => openai('gpt-4o-mini'),
  'gpt-3.5-turbo': () => openai('gpt-3.5-turbo'),
}

// Default models - optimized for speed and cost efficiency
const DEFAULT_CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'
const DEFAULT_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

// Model selection strategies - OpenAI only
export const MODEL_STRATEGIES = {
  // Always use OpenAI (stable and optimized)
  OPENAI_ONLY: 'openai-only',
  
  // Smart selection based on query type
  SMART: 'smart',
  
  // Random selection for A/B testing
  RANDOM: 'random'
}

// Get the current strategy from environment
const CURRENT_STRATEGY = process.env.MODEL_STRATEGY || MODEL_STRATEGIES.OPENAI_ONLY

// Smart model selection based on query characteristics - OpenAI only
function selectModelByQuery(query) {
  const lowerQuery = query.toLowerCase()
  
  // Complex code-heavy queries -> GPT-4.1 (best at complex code understanding)
  if ((lowerQuery.includes('complex') || lowerQuery.includes('advanced')) &&
      (lowerQuery.includes('code') || 
       lowerQuery.includes('function') || 
       lowerQuery.includes('algorithm') ||
       lowerQuery.includes('debug') ||
       lowerQuery.includes('architecture'))) {
    return 'gpt-4.1'
  }
  
  // Very complex technical questions -> GPT-4.1 (better reasoning and long context)
  if (lowerQuery.includes('compare') ||
      lowerQuery.includes('architecture') ||
      lowerQuery.includes('design pattern') ||
      (lowerQuery.length > 100 && lowerQuery.includes('explain'))) {
    return 'gpt-4.1'
  }
  
  // Most queries -> GPT-4o-mini (faster, cheaper, still very capable)
  return 'gpt-4o-mini'
}

// Get model based on strategy - OpenAI only
export function getChatModel(query = '') {
  switch (CURRENT_STRATEGY) {
    case MODEL_STRATEGIES.OPENAI_ONLY:
      return MODELS[DEFAULT_CHAT_MODEL]()
    
    case MODEL_STRATEGIES.SMART:
      const selectedModel = selectModelByQuery(query)
      return MODELS[selectedModel]()
    
    case MODEL_STRATEGIES.RANDOM:
      const models = Object.keys(MODELS)
      const randomModel = models[Math.floor(Math.random() * models.length)]
      return MODELS[randomModel]()
    
    default:
      return MODELS[DEFAULT_CHAT_MODEL]()
  }
}

// Get embedding model based on strategy - OpenAI only
export function getEmbeddingModel() {
  // Always use OpenAI for embeddings (best performance)
  return DEFAULT_EMBEDDING_MODEL
}

// Get embedding provider (always OpenAI for now)
export function getEmbeddingProvider() {
  return 'openai'
}

// Get model info for logging
export function getModelInfo(query = '') {
  const model = getChatModel(query)
  const strategy = CURRENT_STRATEGY
  
  return {
    strategy,
    modelName: model.modelId || 'unknown',
    provider: model.provider || 'unknown'
  }
}

// Test function to try different models
export async function testModels(query, testFunction) {
  const results = {}
  
  for (const [name, modelFn] of Object.entries(MODELS)) {
    try {
      console.log(`[modelSelector] Testing ${name}...`)
      const start = Date.now()
      const result = await testFunction(modelFn())
      const duration = Date.now() - start
      
      results[name] = {
        success: true,
        duration,
        result: result.substring(0, 100) + '...'
      }
    } catch (error) {
      results[name] = {
        success: false,
        error: error.message
      }
    }
  }
  
  return results
}

// Export current configuration
export const CONFIG = {
  strategy: CURRENT_STRATEGY,
  defaultChatModel: DEFAULT_CHAT_MODEL,
  defaultEmbeddingModel: DEFAULT_EMBEDDING_MODEL,
  availableModels: Object.keys(MODELS)
}
