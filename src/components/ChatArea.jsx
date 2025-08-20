import React, { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatArea({ messages, onSend }) {
  const [val, setVal] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    if (!boxRef.current) return
    boxRef.current.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!val.trim()) return
    onSend(val)
    setVal('')
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div ref={boxRef} className="flex-1 overflow-y-auto px-4 py-6 overscroll-contain">
        <div className="space-y-1">
          {messages.map(m => (
            <MessageBubble key={m.id} role={m.role} time={m.time}>
              {m.text}
            </MessageBubble>
          ))}
        </div>
      </div>

      <div className="border-t bg-white/80 backdrop-blur px-3 py-2">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <textarea
            rows={1}
            value={val}
            onChange={(e)=>setVal(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend() }}}
            placeholder="Ask me anything about your documents… ✨"
            className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-200"
          />
          <button
            onClick={handleSend}
            className="shrink-0 rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 active:scale-[0.98]"
          >
            Send ➤
          </button>
        </div>
      </div>
    </div>
  )
}
