import React from 'react'
import CodeBlock from './CodeBlock'
import { detectCodeBlocks, detectLanguage } from '../utils/codeFormatter'

export default function MessageBubble({ role, time, children, dark }) {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  // Format content with code blocks and headings
  const formatContent = (content) => {
    if (typeof content !== 'string') return content
    
    const parts = detectCodeBlocks(content)
    
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <CodeBlock
            key={index}
            code={part.content}
            lang={detectLanguage(part.content, part.language)}
            dark={dark}
          />
        )
      } else if (part.type === 'heading') {
        const headingClasses = {
          1: 'text-2xl font-bold mb-4 mt-6',
          2: 'text-xl font-bold mb-3 mt-5',
          3: 'text-lg font-bold mb-2 mt-4',
          4: 'text-base font-bold mb-2 mt-3',
          5: 'text-sm font-bold mb-1 mt-2',
          6: 'text-xs font-bold mb-1 mt-2'
        }
        
        const level = Math.min(part.level, 6)
        const className = `${headingClasses[level] || headingClasses[6]} ${
          dark ? 'text-black' : 'text-gray-900'
        }`
        
        // Create heading element based on level
        switch (level) {
          case 1:
            return <h1 key={index} className={className}>{part.content}</h1>
          case 2:
            return <h2 key={index} className={className}>{part.content}</h2>
          case 3:
            return <h3 key={index} className={className}>{part.content}</h3>
          case 4:
            return <h4 key={index} className={className}>{part.content}</h4>
          case 5:
            return <h5 key={index} className={className}>{part.content}</h5>
          case 6:
            return <h6 key={index} className={className}>{part.content}</h6>
          default:
            return <h3 key={index} className={className}>{part.content}</h3>
        }
      } else {
        return (
          <div key={index} className="whitespace-pre-wrap leading-relaxed">
            {part.content}
          </div>
        )
      }
    })
  }

  const container = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`
  const bubbleBase = 'max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm'

  const bubble = isUser
    ? `${bubbleBase} ${dark ? 'bg-white text-black border-white/10' : 'bg-neutral-900 text-white border-neutral-800'}`
    : isSystem
      ? `${bubbleBase} ${dark ? 'bg-black/30 text-neutral-300 border-white/10 italic' : 'bg-neutral-100 text-neutral-700 border-neutral-200 italic'}`
      : `${bubbleBase} ${
          dark
            ? 'bg-white text-black border-white/10'
            : 'bg-white text-neutral-800 border-neutral-200'
        }`

  const timeColor = isUser
    ? dark ? 'text-black/60' : 'text-white/70'
    : dark ? 'text-neutral-500' : 'text-neutral-500'

  return (
    <div className={container}>
      <div className={bubble}>
        <div className="space-y-2">
          {formatContent(children)}
        </div>
        <div className={`mt-2 text-[10px] ${timeColor}`}>{time}</div>
      </div>
    </div>
  )
}