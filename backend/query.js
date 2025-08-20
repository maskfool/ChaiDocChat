import { answerFromDocs } from './services/rag.js'

// reusable function for server
export async function answerQuery(question, { topK = 5 } = {}) {
  
  return answerFromDocs(question, { topK })
}

// CLI usage (old way)
if (import.meta.url === `file://${process.argv[1]}`) {
  const question = process.argv.slice(2).join(' ')
  console.log(question);
  if (!question) {
    console.error('Usage: node src/query.js <your question>')
    process.exit(1)
  }
  const res = await answerQuery(question, { topK: 5 })
  console.log('\n=== ANSWER ===\n', res.answer)
  console.log('\n=== CONTEXT CHUNKS ===\n', res.context.slice(0, 2))
}
