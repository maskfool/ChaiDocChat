// backend/src/services/rag.js
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { similaritySearchFiltered, similaritySearch } from './vectorstore.js'
import { getPersona } from '../personas.js'

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini'
const persona = getPersona('hitesh')

function isGreeting(q) {
  const s = q.trim().toLowerCase()
  const words = ['hello', 'hi', 'hey', 'namaste', 'yo', 'hola', 'good morning', 'good evening', 'good afternoon']
  return words.some(w => s === w || s.startsWith(w) || s.includes(` ${w} `))
}

export async function answerFromDocs(
  query,
  { topK = Number(process.env.RAG_TOP_K || 5) } = {}
) {
  // 0) Special-case greeting → fixed Hitesh-style reply (no model, no RAG)
  if (isGreeting(query)) {
    return {
      answer:
        'Hanjiii, kya madat karni hai aapki? 👨‍🏫 Kaise ho? Agar koi concept samajhna hai ya tumhare docs se koi sawaal hai, seedha pooch lo. Practice zaroor karna — ye cheez interview me kaam aayegi! 💪',
      context: [],
      persona: persona.name,
    }
  }

  // 1) Retrieve relevant chunks (filtered)
  let docs = await similaritySearchFiltered(query, { topK, minSimilarity: 0.75 })
  if (docs.length === 0) {
    docs = await similaritySearchFiltered(query, { topK: Math.max(8, topK), minSimilarity: 0.6 })
  }
  if (docs.length === 0) {
    docs = await similaritySearch(query, Math.max(8, topK))
  }

  // 2) If still nothing relevant, fallback with persona tone but say we don’t know
  if (docs.length === 0) {
    return {
      answer:
        "Honestly, mujhe context me iska jawab nahi mila. Agar tum chaho to thoda aur detail do ya koi related document upload/paste karo, phir milke sahi se nikalte hain! 🙂",
      context: [],
      persona: persona.name,
    }
  }

  // 3) Build grounded context
  const context = docs
    .map((d, i) => {
      const src = d.metadata?.source ?? 'unknown'
      const page = d.metadata?.loc?.pageNumber ?? d.metadata?.page ?? ''
      const label = page ? `${src}, p.${page}` : src
      return `# Source ${i + 1} (${label})\n${d.pageContent}`
    })
    .join('\n\n---\n\n')

  // 4) Persona-guided grounded prompt (no greeting)
  const prompt = `
${persona.style}

Always answer directly in Hinglish, without any opening greeting line.

Aapko sirf niche diye gaye "Context" ka use karke answer dena hai.
Agar context me jawab na ho, seedha batao ki context me nahi mila — guess mat karna.

Question:
${query}

Context:
${context}
`.trim()

  const chat = new ChatOpenAI({ apiKey: process.env.OPENAI_API_KEY, model: CHAT_MODEL })
  const aiMsg = await chat.invoke(prompt)

  return {
    answer: typeof aiMsg.content === 'string' ? aiMsg.content : JSON.stringify(aiMsg.content),
    context: docs.map(d => ({ text: d.pageContent, metadata: d.metadata })),
    persona: persona.name,
  }
}
