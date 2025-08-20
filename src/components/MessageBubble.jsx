import React from 'react'

export default function MessageBubble({ role, time, children }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm ${isUser ? 'bg-neutral-900 text-white' : 'bg-white'}`}>
        <div>{children}</div>
        <div className={`mt-1 text-[10px] ${isUser ? 'text-white/70' : 'text-neutral-500'}`}>{time}</div>
      </div>
    </div>
  )
}
