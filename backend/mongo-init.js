// MongoDB initialization script
db = db.getSiblingDB('chaidocchat');

// Create application user
db.createUser({
  user: 'chaidocchat',
  pwd: process.env.MONGO_APP_PASSWORD || 'chaidocchat_password',
  roles: [
    {
      role: 'readWrite',
      db: 'chaidocchat'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['clerkUserId', 'email', 'createdAt'],
      properties: {
        clerkUserId: {
          bsonType: 'string',
          description: 'Clerk user ID must be a string and is required'
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Email must be a valid email address'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Created date must be a date'
        }
      }
    }
  }
});

db.createCollection('documents', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'fileName', 'fileType', 'source', 'uploadDate'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'User ID must be a string'
        },
        fileName: {
          bsonType: 'string',
          description: 'File name must be a string'
        },
        fileType: {
          bsonType: 'string',
          enum: ['pdf', 'text', 'csv', 'json', 'url', 'documentation'],
          description: 'File type must be one of the allowed types'
        },
        source: {
          bsonType: 'string',
          enum: ['file', 'text', 'url', 'documentation'],
          description: 'Source must be one of the allowed types'
        },
        uploadDate: {
          bsonType: 'date',
          description: 'Upload date must be a date'
        }
      }
    }
  }
});

db.createCollection('conversations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'title', 'messages', 'createdAt'],
      properties: {
        userId: {
          bsonType: 'string',
          description: 'User ID must be a string'
        },
        title: {
          bsonType: 'string',
          description: 'Title must be a string'
        },
        messages: {
          bsonType: 'array',
          description: 'Messages must be an array'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Created date must be a date'
        }
      }
    }
  }
});

print('✅ MongoDB initialization completed');
