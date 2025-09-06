# 🚀 ChaiDocChat Migration Guide: Mem0 + Vercel AI SDK

## Overview
This guide helps you migrate from the current LangChain-based implementation to an optimized version using Mem0 for memory management and Vercel AI SDK for better performance.

## 🎯 Benefits of Migration

### **Memory Management (Mem0)**
- ✅ **Persistent Memory**: Documents and conversations are remembered across sessions
- ✅ **Recent Document Tracking**: Automatically prioritizes recently uploaded documents
- ✅ **Conversation Context**: Maintains context from previous interactions
- ✅ **Smart Retrieval**: Combines vector search with memory-based context

### **Vercel AI SDK**
- ✅ **Unified API**: Single interface for multiple AI providers
- ✅ **Better Streaming**: Native support for real-time responses
- ✅ **Reduced Boilerplate**: Less code for common AI operations
- ✅ **Future-Proof**: Easy to switch between AI models

### **Code Reduction**
- ✅ **50% Less Code**: Simplified API structure
- ✅ **Better Error Handling**: Centralized error management
- ✅ **Modular Design**: Cleaner separation of concerns
- ✅ **Enhanced Features**: Recent docs, conversation context, better UX

## 📋 Migration Steps

### 1. Install New Dependencies

```bash
cd backend
npm install mem0ai ai @ai-sdk/openai --legacy-peer-deps
```

### 2. Update Environment Variables

Add to your `.env` file:
```env
# Existing variables
OPENAI_API_KEY=your_openai_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
QDRANT_COLLECTION=chaicode-collection

# New variables for enhanced features
OPENAI_CHAT_MODEL=gpt-4o-mini
RAG_TOP_K=5
NODE_ENV=production
```

### 3. Replace Files

**Backend Files to Replace:**
- `server.js` → `server-optimized.js`
- `services/rag.js` → `services/rag-optimized.js`
- Add: `services/memory.js`
- Add: `routes/api.js`

**Frontend Files to Replace:**
- `App.jsx` → `App-optimized.jsx`
- `api/index.js` → `api/client.js`
- `api/chat.js` → `api/services.js`
- `api/upload.js` → (integrated into services.js)

### 4. Update Package.json Scripts

```json
{
  "scripts": {
    "dev": "node server-optimized.js",
    "start": "node server-optimized.js",
    "dev:old": "node server.js",
    "index": "node indexing.js",
    "query": "node query.js \"What is the Node.js event loop?\""
  }
}
```

### 5. Test the Migration

```bash
# Start the optimized backend
npm run dev

# In another terminal, start the frontend
cd ../
npm run dev
```

## 🔧 New Features

### **Enhanced Chat API**
```javascript
// New response format includes memory context
{
  "success": true,
  "answer": "Response text",
  "context": [...],
  "persona": "Hitesh Choudhary",
  "sources": ["file1.pdf", "file2.txt"],
  "recentDocs": 3,
  "conversationContext": 2
}
```

### **New API Endpoints**
- `GET /api/documents/recent?hours=24` - Get recent documents
- `GET /api/conversation/context?limit=10` - Get conversation context
- `GET /api/health` - Enhanced health check

### **Memory Features**
- **Document Memory**: Stores document chunks with metadata
- **Conversation Memory**: Remembers user interactions
- **Recent Document Priority**: Automatically prioritizes recent uploads
- **Context-Aware Responses**: Uses conversation history for better answers

## 🐛 Troubleshooting

### **Common Issues**

1. **Mem0 Installation Issues**
   ```bash
   # If you get peer dependency conflicts
   npm install mem0ai --legacy-peer-deps
   ```

2. **Qdrant Version Conflicts**
   ```bash
   # Update Qdrant client
   npm install @qdrant/js-client-rest@latest
   ```

3. **Environment Variables**
   - Ensure all required environment variables are set
   - Check that Qdrant is running and accessible

### **Rollback Plan**
If issues occur, you can easily rollback:
```bash
# Use the old server
npm run dev:old

# Or restore original files from git
git checkout HEAD -- server.js services/rag.js
```

## 📊 Performance Improvements

### **Before (LangChain)**
- ❌ No memory persistence
- ❌ No conversation context
- ❌ Basic error handling
- ❌ Limited API structure

### **After (Mem0 + Vercel AI SDK)**
- ✅ Persistent memory across sessions
- ✅ Conversation context awareness
- ✅ Enhanced error handling
- ✅ Modular API structure
- ✅ Recent document prioritization
- ✅ Better user experience

## 🎉 Next Steps

1. **Test thoroughly** with your existing documents
2. **Monitor performance** and memory usage
3. **Customize personas** in `personas.js`
4. **Add more memory features** as needed
5. **Consider adding streaming** for real-time responses

## 📞 Support

If you encounter any issues during migration:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Qdrant is running and accessible
4. Test with a simple document upload first

---

**Happy coding! 🚀**
