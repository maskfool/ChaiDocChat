// src/components/VoiceAgent.jsx
import React, { useState, useEffect, useRef } from 'react'
import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime'

export default function VoiceAgent({ dark, onMessage }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState('')
  const [error, setError] = useState(null)
  const [clientSecret, setClientSecret] = useState(null)
  const [useStreaming, setUseStreaming] = useState(true)
  const [useToolCalling, setUseToolCalling] = useState(true)
  
  const sessionRef = useRef(null)
  const agentRef = useRef(null)

  // Initialize the voice agent
  useEffect(() => {
    const initializeAgent = async () => {
      try {
        // Create the RealtimeAgent
        agentRef.current = new RealtimeAgent({
          name: 'ChaiDoc Assistant',
          instructions: `You are ChaiDoc Assistant, a helpful AI that can chat about documents in Hinglish (Hindi + English mix).

Your personality is like Hitesh Choudhary - friendly, encouraging, and slightly motivational.
- Speak in Hinglish naturally
- Keep responses conversational and helpful
- When discussing code or technical topics, explain step by step
- Use headings like "### Step 1: Title" for structured responses
- Be encouraging: "Practice zaroor karna", "Ye cheez interview me kaam aayegi"

You have access to document memory and can search through uploaded documents to provide accurate, context-aware responses.

IMPORTANT: When you use the search_documents tool, ALWAYS use the 'answer' field from the tool result as your primary response. The 'answer' field contains the processed, accurate information from the documents. 

CRITICAL: If the tool result contains 'key_facts' with specific dates or information, use those EXACT values. 

Do NOT make up information or use outdated data. Always use the exact information provided in the tool result.

Always be helpful and maintain a positive, teaching tone.`,
          
          // Add tools for document search
          tools: [
            {
              name: 'search_documents',
              description: 'Search through uploaded documents for relevant information. Use this tool to find specific information from the user\'s uploaded documents.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query to find relevant document content. Be specific and use keywords from the user\'s question.'
                  }
                },
                required: ['query']
              }
            },
            {
              name: 'get_recent_documents',
              description: 'Get recently uploaded documents to understand what the user has been working on',
              parameters: {
                type: 'object',
                properties: {
                  hours: {
                    type: 'number',
                    description: 'Number of hours to look back for recent documents',
                    default: 24
                  }
                }
              }
            },
            {
              name: 'get_conversation_context',
              description: 'Get previous conversation context to maintain continuity',
              parameters: {
                type: 'object',
                properties: {
                  limit: {
                    type: 'number',
                    description: 'Number of previous interactions to retrieve',
                    default: 5
                  }
                }
              }
            }
          ]
        })

        // Create the RealtimeSession
        sessionRef.current = new RealtimeSession(agentRef.current, {
          model: 'gpt-realtime'
        })

        // Verify session was created properly
        if (!sessionRef.current) {
          throw new Error('Failed to create RealtimeSession')
        }

        // Set up event listeners
        setupEventListeners()
      } catch (err) {
        console.error('Error initializing voice agent:', err)
        setError('Failed to initialize voice agent')
      }
    }

    initializeAgent()

    return () => {
      if (sessionRef.current) {
        try {
          if (typeof sessionRef.current.disconnect === 'function') {
            sessionRef.current.disconnect()
          } else if (typeof sessionRef.current.close === 'function') {
            sessionRef.current.close()
          }
        } catch (err) {
          console.warn('Error during cleanup:', err)
        }
      }
    }
  }, [])

  const setupEventListeners = () => {
    if (!sessionRef.current) return

    // Debug: Log all events
    const originalEmit = sessionRef.current.emit
    sessionRef.current.emit = function(event, ...args) {
      console.log(`[VoiceAgent] Event: ${event}`, args)
      return originalEmit.apply(this, [event, ...args])
    }

    // Listen for session events
    sessionRef.current.on('session_started', () => {
      console.log('Voice session started')
      setIsConnected(true)
      setIsConnecting(false)
      setError(null)
    })

    sessionRef.current.on('session_ended', () => {
      console.log('Voice session ended')
      setIsConnected(false)
      setIsListening(false)
      setIsSpeaking(false)
    })

    sessionRef.current.on('response_started', () => {
      console.log('AI started responding')
      setIsSpeaking(true)
    })

    sessionRef.current.on('response_completed', () => {
      console.log('AI finished responding')
      setIsSpeaking(false)
    })

    sessionRef.current.on('transcript_delta', (event) => {
      console.log('Transcript delta:', event)
      if (event.transcript) {
        setIsListening(true)
      }
    })

    sessionRef.current.on('error', (err) => {
      console.error('Voice session error:', err)
      setError(err.message || 'Voice session error')
      setIsConnecting(false)
      setIsConnected(false)
    })

    // Handle tool calls - try multiple event names
    const handleToolCall = async (toolCall) => {
      console.log('Tool call received:', toolCall)
      
      // Show search progress for document search
      if (toolCall.name === 'search_documents') {
        setIsSearching(true)
        setSearchProgress('🔍 Searching through your documents...')
      }
      
      try {
        const response = await fetch('/api/voice-agent/execute-tool', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tool_name: toolCall.name,
            arguments: toolCall.parameters
          })
        })

        const data = await response.json()
        console.log('Tool execution result:', data)
        
        if (data.success) {
          // Update progress for document search
          if (toolCall.name === 'search_documents') {
            if (data.result.found) {
              setSearchProgress(`✅ Found ${data.result.documents.length} relevant documents`)
              // Debug: Log the exact answer being sent to voice agent
              console.log('🎯 ANSWER BEING SENT TO VOICE AGENT:', data.result.answer)
            } else {
              setSearchProgress('❌ No relevant documents found')
            }
            // Clear search progress after 2 seconds
            setTimeout(() => {
              setIsSearching(false)
              setSearchProgress('')
            }, 2000)
          }
          
          // Submit tool result back to the agent
          console.log('Submitting tool result:', data.result)
          console.log('🎯 SPECIFICALLY THE ANSWER FIELD:', data.result.answer)
          await sessionRef.current.submitToolResult(toolCall.id, data.result)
        } else {
          console.error('Tool execution failed:', data.error)
          if (toolCall.name === 'search_documents') {
            setSearchProgress('❌ Search failed')
            setTimeout(() => {
              setIsSearching(false)
              setSearchProgress('')
            }, 2000)
          }
          await sessionRef.current.submitToolResult(toolCall.id, { error: data.error })
        }
      } catch (err) {
        console.error('Error executing tool:', err)
        if (toolCall.name === 'search_documents') {
          setSearchProgress('❌ Search error')
          setTimeout(() => {
            setIsSearching(false)
            setSearchProgress('')
          }, 2000)
        }
        await sessionRef.current.submitToolResult(toolCall.id, { error: err.message })
      }
    }

    // Try different event names for tool calls
    sessionRef.current.on('tool_call', handleToolCall)
    sessionRef.current.on('tool_calls', handleToolCall)
    sessionRef.current.on('tool_use', handleToolCall)
    sessionRef.current.on('function_call', handleToolCall)
    
    // Also try listening for any event that might contain tool calls
    sessionRef.current.on('message', (message) => {
      console.log('Message received:', message)
      if (message.type === 'tool_call' || message.tool_calls) {
        const toolCalls = message.tool_calls || [message]
        toolCalls.forEach(handleToolCall)
      }
    })
  }

  const getClientSecret = async () => {
    try {
      const response = await fetch('/api/voice-agent/client-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get client secret')
      }

      return data.client_secret
    } catch (err) {
      console.error('Error getting client secret:', err)
      throw err
    }
  }

  // Streaming response function
  const streamAnswer = async (query) => {
    try {
      console.log('🌊 Starting streaming response for:', query)
      setSearchProgress('Streaming response...')
      
      const response = await fetch('/api/voice-agent/stream-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) {
        throw new Error(`Streaming error: ${response.status}`)
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullAnswer = ''
      
      // Send initial message to voice agent
      sessionRef.current.send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'input_text', text: '' }]
        }
      })
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        fullAnswer += chunk
        
        // Send chunk to voice agent
        sessionRef.current.send({
          type: 'conversation.item.append',
          item: { type: 'text', text: chunk }
        })
      }
      
      console.log('🌊 Streaming completed:', fullAnswer)
      setSearchProgress('')
      return fullAnswer
      
    } catch (error) {
      console.error('❌ Streaming error:', error)
      setSearchProgress('')
      throw error
    }
  }

  // Tool calling response function
  const toolCallAnswer = async (query) => {
    try {
      console.log('🛠️ Starting tool calling for:', query)
      setSearchProgress('AI is selecting tools...')
      
      const response = await fetch('/api/voice-agent/tool-call-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) {
        throw new Error(`Tool calling error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('🛠️ Tool calling response:', data)
      
      // Send answer to voice agent
      sessionRef.current.send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'input_text', text: data.answer }]
        }
      })
      
      setSearchProgress('')
      return data.answer
      
    } catch (error) {
      console.error('❌ Tool calling error:', error)
      setSearchProgress('')
      throw error
    }
  }

  const connectVoiceAgent = async () => {
    if (isConnected || isConnecting) return

    if (!sessionRef.current) {
      setError('Voice agent not initialized. Please refresh the page.')
      return
    }

    try {
      setIsConnecting(true)
      setError(null)

      // Get client secret
      const secret = await getClientSecret()
      setClientSecret(secret)

      // Connect to the session
      await sessionRef.current.connect({
        apiKey: secret
      })

    } catch (err) {
      console.error('Error connecting voice agent:', err)
      setError(err.message || 'Failed to connect voice agent')
      setIsConnecting(false)
    }
  }

  const disconnectVoiceAgent = async () => {
    if (!isConnected || !sessionRef.current) return

    try {
      // Check if disconnect method exists before calling
      if (typeof sessionRef.current.disconnect === 'function') {
        await sessionRef.current.disconnect()
      } else if (typeof sessionRef.current.close === 'function') {
        await sessionRef.current.close()
      } else {
        console.warn('No disconnect method available, manually resetting state')
      }
      
      setIsConnected(false)
      setIsListening(false)
      setIsSpeaking(false)
      setClientSecret(null)
    } catch (err) {
      console.error('Error disconnecting voice agent:', err)
      // Force reset state even if disconnect fails
      setIsConnected(false)
      setIsListening(false)
      setIsSpeaking(false)
      setClientSecret(null)
    }
  }

  const toggleVoiceChat = async () => {
    if (isConnected) {
      await disconnectVoiceAgent()
    } else {
      await connectVoiceAgent()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Voice Status */}
      <div className={`rounded-xl p-4 w-full max-w-md ${
        dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
      } border`}>
        <div className="text-center">
          <div className="text-sm font-medium mb-2">
            {isConnected ? '🎤 Voice Connected' : '🔇 Voice Disconnected'}
          </div>
          
          {isSearching && (
            <div className="text-xs text-blue-500 mb-2 animate-pulse">
              📚 {searchProgress}
            </div>
          )}
          
          {isConnecting && (
            <div className="text-sm text-blue-600 animate-pulse">
              Connecting to voice agent...
            </div>
          )}
          
          {isListening && (
            <div className="text-sm text-green-600 animate-pulse">
              🎧 Listening...
            </div>
          )}
          
          {isSpeaking && (
            <div className="text-sm text-purple-600 animate-pulse">
              🔊 AI Speaking...
            </div>
          )}
          
          {isSearching && (
            <div className="text-sm text-blue-600 animate-pulse">
              {searchProgress}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-600 mt-2">
              ❌ {error}
            </div>
          )}
        </div>
      </div>

      {/* Feature Controls */}
      <div className={`rounded-xl p-4 w-full max-w-md ${
        dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
      } border`}>
        <div className="text-center mb-3">
          <div className="text-sm font-medium mb-2">🚀 Advanced Features</div>
        </div>
        
        <div className="space-y-3">
          {/* Streaming Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              🌊 Streaming Response
            </label>
            <button
              onClick={() => setUseStreaming(!useStreaming)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useStreaming ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useStreaming ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Tool Calling Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              🛠️ AI Tool Calling
            </label>
            <button
              onClick={() => setUseToolCalling(!useToolCalling)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                useToolCalling ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useToolCalling ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-gray-500 text-center">
          {useStreaming && useToolCalling && "🚀 Both features enabled - Best experience!"}
          {useStreaming && !useToolCalling && "🌊 Streaming only - Fast responses"}
          {!useStreaming && useToolCalling && "🛠️ Tool calling only - Smart AI"}
          {!useStreaming && !useToolCalling && "⚡ Basic mode - Simple responses"}
        </div>
      </div>

      {/* Voice Controls */}
      <div className="flex gap-3">
        <button
          onClick={isConnected ? disconnectVoiceAgent : connectVoiceAgent}
          disabled={isConnecting}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            isConnected
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          } ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isConnecting ? '⏳ Connecting...' : isConnected ? '🔇 Disconnect' : '🎤 Connect Voice'}
        </button>
        
        {/* Test button for debugging */}
        <button
          onClick={async () => {
            console.log('Testing tool execution...')
            try {
              const response = await fetch('/api/voice-agent/execute-tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tool_name: 'search_documents',
                  arguments: { query: 'deadline for case number 2025/001' }
                })
              })
              const data = await response.json()
              console.log('Test result:', data)
              alert(`Test result: ${data.success ? 'SUCCESS' : 'FAILED'}\nFound: ${data.result?.found}\nAnswer: ${data.result?.answer?.substring(0, 100)}...`)
            } catch (err) {
              console.error('Test error:', err)
              alert('Test failed: ' + err.message)
            }
          }}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
        >
          🧪 Test Search
        </button>
        
        {/* Streaming Test Button */}
        <button
          onClick={async () => {
            try {
              setSearchProgress('Testing streaming...')
              const result = await streamAnswer('What is the deadline for case number 2025/001?')
              console.log('Streaming test result:', result)
              setSearchProgress('')
            } catch (err) {
              console.error('Streaming test failed:', err)
              setSearchProgress('')
              alert('Streaming test failed: ' + err.message)
            }
          }}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
        >
          🌊 Test Streaming
        </button>
        
        {/* Tool Calling Test Button */}
        <button
          onClick={async () => {
            try {
              setSearchProgress('Testing tool calling...')
              const result = await toolCallAnswer('What is the deadline for case number 2025/001?')
              console.log('Tool calling test result:', result)
              setSearchProgress('')
            } catch (err) {
              console.error('Tool calling test failed:', err)
              setSearchProgress('')
              alert('Tool calling test failed: ' + err.message)
            }
          }}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
        >
          🛠️ Test Tool Calling
        </button>
      </div>

      {/* Instructions */}
      <div className={`text-sm text-center max-w-md ${
        dark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        {!isConnected ? (
          <p>
            Click "Connect Voice" to start talking with your documents. 
            The AI will respond in Hinglish with Hitesh Choudhary's style!
          </p>
        ) : (
          <p>
            🎤 Start speaking! The AI will listen and respond with voice. 
            You can ask questions about your uploaded documents.
          </p>
        )}
      </div>

      {/* Features */}
      <div className={`text-xs text-center max-w-md ${
        dark ? 'text-gray-500' : 'text-gray-500'
      }`}>
        <p>✨ Real-time voice conversation • Document search • Hinglish responses</p>
      </div>
    </div>
  )
}
