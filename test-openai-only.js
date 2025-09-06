// test-openai-only.js - Test OpenAI-only implementation
import 'dotenv/config'
import { getChatModel, getModelInfo, getEmbeddingModel, getEmbeddingProvider, MODEL_STRATEGIES } from './backend/services/modelSelector.js'
import { generateText } from 'ai'

async function testOpenAIImplementation() {
  console.log('🚀 Testing OpenAI-Only Implementation\n')
  
  // Test different strategies
  const strategies = [
    { name: 'OpenAI Only (Default)', strategy: MODEL_STRATEGIES.OPENAI_ONLY },
    { name: 'Smart Selection', strategy: MODEL_STRATEGIES.SMART },
    { name: 'Random Selection', strategy: MODEL_STRATEGIES.RANDOM }
  ]
  
  const testQueries = [
    "What is the AI SDK?",
    "How do I use generateText with React?",
    "Show me code example for tool calling",
    "What are the best practices for RAG?",
    "Explain the difference between streaming and non-streaming"
  ]
  
  for (const { name, strategy } of strategies) {
    console.log(`\n📋 Testing: ${name}`)
    console.log(`Strategy: ${strategy}`)
    console.log('=' * 50)
    
    // Set environment variable for this test
    process.env.MODEL_STRATEGY = strategy
    
    const chatModel = getChatModel()
    const chatInfo = getModelInfo()
    const embeddingModel = getEmbeddingModel()
    const embeddingProvider = getEmbeddingProvider()
    
    console.log(`Chat Model: ${chatInfo.modelName} (${chatInfo.provider})`)
    console.log(`Embedding Model: ${embeddingModel} (${embeddingProvider})`)
    
    // Test with a simple query
    const testQuery = "What is the AI SDK?"
    
    try {
      const start = Date.now()
      const { text } = await generateText({
        model: chatModel,
        prompt: `Answer this question briefly: ${testQuery}`,
        maxTokens: 100
      })
      const duration = Date.now() - start
      
      console.log(`Response: ${text.substring(0, 150)}...`)
      console.log(`Duration: ${duration}ms`)
      console.log('✅ Success!')
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n🎉 OpenAI-only testing completed!')
  console.log('\n💡 All models are now using OpenAI for optimal performance and accuracy')
}

// Test smart model selection with different query types
async function testSmartSelection() {
  console.log('\n🧠 Testing Smart Model Selection\n')
  
  process.env.MODEL_STRATEGY = MODEL_STRATEGIES.SMART
  
  const testCases = [
    { query: "What is React?", type: "Simple factual" },
    { query: "How do I implement authentication in Next.js with TypeScript?", type: "Code-heavy" },
    { query: "Explain the difference between SSR and SSG", type: "Complex technical" },
    { query: "What is the meaning of API?", type: "Simple definition" },
    { query: "Compare different database architectures for microservices", type: "Complex comparison" }
  ]
  
  for (const { query, type } of testCases) {
    try {
      const model = getChatModel(query)
      const modelInfo = getModelInfo(query)
      
      console.log(`${type}: "${query}"`)
      console.log(`Selected: ${modelInfo.modelName}`)
      console.log('---')
      
    } catch (error) {
      console.log(`${type}: Error - ${error.message}`)
    }
  }
}

// Run tests
async function runTests() {
  await testOpenAIImplementation()
  await testSmartSelection()
}

runTests().catch(console.error)
