import { body, param, query, validationResult } from 'express-validator'
import logger from '../config/logger.js'

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    logger.warn('Validation error', { 
      errors: errors.array(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    })
  }
  next()
}

// File upload validation
export const validateFileUpload = [
  body('file').custom((value, { req }) => {
    if (!req.file) {
      throw new Error('No file provided')
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (req.file.size > maxSize) {
      throw new Error('File size too large. Maximum size is 10MB')
    }
    
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json'
    ]
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error('Invalid file type. Allowed types: PDF, TXT, DOCX, CSV, JSON')
    }
    
    return true
  }),
  handleValidationErrors
]

// Text content validation
export const validateTextContent = [
  body('text')
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Text must be between 1 and 50,000 characters')
    .trim()
    .escape(),
  handleValidationErrors
]

// URL validation
export const validateUrl = [
  body('url')
    .isURL({ 
      protocols: ['http', 'https'],
      require_protocol: true 
    })
    .withMessage('Must be a valid HTTP or HTTPS URL')
    .isLength({ max: 2048 })
    .withMessage('URL too long'),
  handleValidationErrors
]

// Chat message validation
export const validateChatMessage = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10,000 characters')
    .trim()
    .escape(),
  handleValidationErrors
]

// Query parameters validation
export const validateQueryParams = [
  query('topK')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('topK must be between 1 and 20'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  handleValidationErrors
]

// Sanitize input to prevent XSS
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim()
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key])
      }
    }
    return obj
  }
  
  if (req.body) {
    req.body = sanitize(req.body)
  }
  if (req.query) {
    req.query = sanitize(req.query)
  }
  if (req.params) {
    req.params = sanitize(req.params)
  }
  
  next()
}
