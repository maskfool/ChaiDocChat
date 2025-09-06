// src/App-optimized.jsx
import React, { useEffect, useState } from "react"
import { useUser, useAuth } from "@clerk/clerk-react"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar"
import { 
  Mic, 
  MicOff, 
  Sun, 
  Moon, 
  LogOut, 
  Sparkles,
  Bot,
  User
} from "lucide-react"
import Sidebar from "./components/Sidebar"
import ChatArea from "./components/ChatArea"
import VoiceAgent from "./components/VoiceAgent"
import AuthGuard from "./components/auth/AuthGuard"
import { documentService, chatService } from "./api/services"

function MainApp() {
  const { user } = useUser()
  const { signOut } = useAuth()
  const [uploads, setUploads] = useState([])
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: `Welcome ${user?.firstName || 'there'}! Upload docs ya text/URL bhejo, aur sawal pucho. 😃`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ])
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    if (saved) return saved === "dark"
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showVoiceAgent, setShowVoiceAgent] = useState(false)

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await signOut()
      } catch (error) {
        console.error('Logout failed:', error)
      }
    }
  }

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add("dark")
    else root.classList.remove("dark")
    localStorage.setItem("theme", dark ? "dark" : "light")
  }, [dark])

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  function addSystemMessage(text, customId = Date.now()) {
    setMessages((m) => [...m, { id: customId, role: "system", text, time: now() }])
    return customId
  }

  function updateSystemMessage(id, newText) {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: newText, time: now() } : msg)))
  }

  // Enhanced file upload with memory integration
  async function addFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return

    for (const file of files) {
      setUploads((u) => [...u, { id: file.name, kind: "file", name: file.name, size: file.size }])
      const pendingId = Date.now() + Math.random()
      addSystemMessage(`⏳ Uploading & scanning file "${file.name}"...`, pendingId)
      
      try {
        const result = await documentService.uploadFile(file)
        updateSystemMessage(pendingId, `✅ File "${file.name}" uploaded & indexed successfully! (${result.chunksIndexed} chunks)`)
      } catch (error) {
        updateSystemMessage(pendingId, `❌ File "${file.name}" upload failed: ${error.message}`)
      }
    }
  }

  // Enhanced text upload with memory integration
  async function addText(text) {
    if (!text.trim()) return
    
    setUploads((u) => [...u, { id: `txt-${Date.now()}`, kind: "text", name: text.slice(0, 40) }])
    const pendingId = Date.now() + Math.random()
    addSystemMessage("⏳ Processing your text snippet...", pendingId)
    
    try {
      const result = await documentService.uploadText(text)
      updateSystemMessage(pendingId, `✅ Text snippet added & processed successfully! (${result.chunksIndexed} chunks)`)
    } catch (error) {
      updateSystemMessage(pendingId, `❌ Failed to process text snippet: ${error.message}`)
    }
  }

  // Enhanced URL upload with memory integration
  async function addUrl(url) {
    if (!url.trim()) return
    
    setUploads((u) => [...u, { id: `url-${Date.now()}`, kind: "url", name: url }])
    const pendingId = Date.now() + Math.random()
    addSystemMessage(`⏳ Processing URL "${url}"...`, pendingId)
    
    try {
      // Use enhanced crawling for better results
      const result = await documentService.uploadUrl(url, { enhanced: true, depth: 2, maxPages: 20 })
      updateSystemMessage(pendingId, `✅ URL "${url}" processed & indexed successfully! (${result.chunksIndexed} chunks)`)
    } catch (error) {
      updateSystemMessage(pendingId, `❌ Failed to process URL "${url}": ${error.message}`)
    }
  }

  // Enhanced documentation site crawling with memory integration
  async function addDocumentation(url) {
    if (!url.trim()) return
    
    setUploads((u) => [...u, { id: `doc-${Date.now()}`, kind: "documentation", name: url }])
    const pendingId = Date.now() + Math.random()
    addSystemMessage(`🕷️ Crawling website "${url}"...`, pendingId)
    
    try {
      // Use sensible defaults for SaaS product
      const options = { maxPages: 100, maxDepth: 4 }
      const result = await documentService.uploadDocumentation(url, options)
      updateSystemMessage(pendingId, `✅ Website "${url}" crawled & indexed successfully! (${result.pagesCrawled} pages, ${result.chunksIndexed} chunks)`)
    } catch (error) {
      updateSystemMessage(pendingId, `❌ Failed to crawl website "${url}": ${error.message}`)
    }
  }

  // Enhanced chat with memory and context
  async function sendMessage(text) {
    if (!text.trim() || isLoading) return
    
    const userId = Date.now()
    const pendingId = userId + 1
    
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", text, time: now() },
      { id: pendingId, role: "assistant", text: "⏳ Thinking...", time: now() },
    ])
    
    setIsLoading(true)
    
    try {
      const result = await chatService.askQuestion(text)
      
      setMessages((m) => m.map((msg) => 
        msg.id === pendingId 
          ? { 
              ...msg, 
              text: result.answer,
              sources: result.sources || [],
              recentDocs: result.recentDocs || 0,
              conversationContext: result.conversationContext || 0
            } 
          : msg
      ))
    } catch (error) {
      setMessages((m) =>
        m.map((msg) => 
          msg.id === pendingId 
            ? { ...msg, text: `❌ Chat request failed: ${error.message}` } 
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col paper-grid">
      <header className={`h-16 border-b flex items-center justify-between px-6 backdrop-blur-md transition-all duration-300 ${
        dark 
          ? "bg-black/80 border-white/10 text-neutral-100 shadow-2xl shadow-black/20" 
          : "bg-white/80 border-neutral-200 text-neutral-800 shadow-xl shadow-neutral-200/20"
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 grid place-items-center rounded-xl text-sm font-bold transition-all duration-300 hover:scale-110 ${
              dark 
                ? "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25" 
                : "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25"
            }`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-lg bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                DocChat
              </h1>
              
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-xs">
                {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">
                {user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0]}
              </div>
              <div className="text-xs opacity-60">
                {user?.emailAddresses[0]?.emailAddress}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowVoiceAgent(!showVoiceAgent)}
              variant={showVoiceAgent ? "default" : "outline"}
              size="sm"
              className={`transition-all duration-300 ${
                showVoiceAgent 
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25" 
                  : "hover:bg-blue-50 dark:hover:bg-blue-950/20"
              }`}
            >
              {showVoiceAgent ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Voice Off
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Voice On
                </>
              )}
            </Button>

            <Button
              onClick={() => setDark(d => !d)}
              variant="outline"
              size="sm"
              className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {dark ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </>
              )}
            </Button>

            <Button
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className={`w-[340px] border-r p-4 overflow-y-auto ${
          dark ? "bg-black/40 border-white/10" : "bg-neutral-50/70 border-neutral-200"
        }`}>
          <Sidebar 
            dark={dark} 
            uploads={uploads} 
            addFiles={addFiles} 
            addText={addText} 
            addUrl={addUrl} 
            addDocumentation={addDocumentation}
          />
        </aside>

        <section className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className={`border-b px-4 py-3 ${
            dark ? "bg-black/50 border-white/10" : "bg-white/70 border-neutral-200"
          }`}>
            <div className="text-sm font-medium">Chat with your documents</div>
            <div className={`${dark ? "text-neutral-400" : "text-neutral-500"} text-xs`}>
              Upload documents to start chatting • Enhanced with memory & context • Voice chat available
            </div>
          </div>
          
          {showVoiceAgent ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <VoiceAgent 
                dark={dark} 
                onMessage={sendMessage}
              />
            </div>
          ) : (
            <ChatArea 
              dark={dark} 
              messages={messages} 
              onSend={sendMessage}
              isLoading={isLoading}
            />
          )}
        </section>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthGuard>
      <MainApp />
    </AuthGuard>
  )
}
