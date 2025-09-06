import Joi from 'joi'
import 'dotenv/config'

// Environment validation schema
const envSchema = Joi.object({
  // Required environment variables
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(5001),
  
  // Database
  MONGODB_URI: Joi.string().required().messages({
    'any.required': 'MONGODB_URI is required'
  }),
  
  // Clerk Authentication
  CLERK_SECRET_KEY: Joi.string().required().messages({
    'any.required': 'CLERK_SECRET_KEY is required'
  }),
  
  // Qdrant Vector Database
  QDRANT_URL: Joi.string().uri().required().messages({
    'any.required': 'QDRANT_URL is required'
  }),
  QDRANT_API_KEY: Joi.string().optional(),
  QDRANT_COLLECTION: Joi.string().default('chaicode-collection'),
  
  // OpenAI
  OPENAI_API_KEY: Joi.string().required().messages({
    'any.required': 'OPENAI_API_KEY is required'
  }),
  
  // Embedding configuration
  EMBEDDING_DIM: Joi.number().default(1536),
  RAG_TOP_K: Joi.number().default(5),
  
  // Security
  JWT_SECRET: Joi.string().min(32).optional(),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // File upload limits
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  MAX_FILES_PER_REQUEST: Joi.number().default(5),
  
  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:5173,http://localhost:3000'),
  
  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info')
}).unknown()

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env)

if (error) {
  console.error('❌ Environment validation failed:')
  console.error(error.details.map(detail => `  - ${detail.message}`).join('\n'))
  process.exit(1)
}

// Export validated environment variables
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  database: {
    uri: envVars.MONGODB_URI
  },
  clerk: {
    secretKey: envVars.CLERK_SECRET_KEY
  },
  qdrant: {
    url: envVars.QDRANT_URL,
    apiKey: envVars.QDRANT_API_KEY,
    collection: envVars.QDRANT_COLLECTION
  },
  openai: {
    apiKey: envVars.OPENAI_API_KEY
  },
  embedding: {
    dim: envVars.EMBEDDING_DIM,
    topK: envVars.RAG_TOP_K
  },
  security: {
    jwtSecret: envVars.JWT_SECRET,
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW_MS,
      max: envVars.RATE_LIMIT_MAX_REQUESTS
    }
  },
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    maxFiles: envVars.MAX_FILES_PER_REQUEST
  },
  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  },
  logging: {
    level: envVars.LOG_LEVEL
  }
}

console.log('✅ Environment validation passed')
console.log(`🚀 Starting in ${config.env} mode on port ${config.port}`)
