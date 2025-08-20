// src/services/embedding.js
import 'dotenv/config'
import { OpenAIEmbeddings } from '@langchain/openai'

export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,      // set in dochat-backend/.env
  model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
})
