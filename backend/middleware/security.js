import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { config } from '../config/env.js'
import logger from '../config/logger.js'

// Rate limiting configuration
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      })
      res.status(429).json({
        success: false,
        error: message || 'Too many requests, please try again later'
      })
    }
  })
}

// General API rate limiting
export const apiRateLimit = createRateLimit(
  config.security.rateLimit.windowMs,
  config.security.rateLimit.max,
  'Too many API requests, please try again later'
)

// Stricter rate limiting for file uploads
export const uploadRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 uploads per 15 minutes
  'Too many file uploads, please try again later'
)

// Stricter rate limiting for chat
export const chatRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 messages per minute
  'Too many chat messages, please slow down'
)

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.clerk.com"],
      frameSrc: ["'self'", "https://clerk.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})

// Request size limiting
export const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0')
  const maxSize = config.upload.maxFileSize
  
  if (contentLength > maxSize) {
    logger.warn('Request too large', {
      contentLength,
      maxSize,
      ip: req.ip,
      endpoint: req.path
    })
    
    return res.status(413).json({
      success: false,
      error: 'Request entity too large',
      maxSize: `${maxSize / 1024 / 1024}MB`
    })
  }
  
  next()
}

// CORS configuration
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    
    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn('CORS blocked request', { origin, ip: req?.ip })
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
}

// Security logging middleware
export const securityLogger = (req, res, next) => {
  const start = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - start
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.clerkUserId || 'anonymous'
    }
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP request', logData)
    } else {
      logger.info('HTTP request', logData)
    }
  })
  
  next()
}

// IP whitelist (optional - for admin endpoints)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) return next()
    
    const clientIP = req.ip || req.connection.remoteAddress
    
    if (allowedIPs.includes(clientIP)) {
      next()
    } else {
      logger.warn('IP not whitelisted', { ip: clientIP, endpoint: req.path })
      res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
  }
}
