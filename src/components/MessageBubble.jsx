import React from 'react'
import CodeBlock from './CodeBlock'
import { splitFencedCode, renderInlineCode } from '../utils/markdown.jsx'

export default function MessageBubble({ role, time, children }) {
  const isUser = role === 'user'
  const isSystem = role === 'system'
  const text = typeof children === 'string' ? children : String(children ?? '')

  const segments = splitFencedCode(text)

  const container = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`
  const bubbleBase = 'max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm'
  const bubble =
    isUser
      ? `${bubbleBase} bg-neutral-900 text-white`
      : isSystem
        ? `${bubbleBase} bg-neutral-100 text-neutral-700 border-neutral-200 italic`
        : `${bubbleBase} bg-white`

  return (
    <div className={container}>
      <div className={bubble}>
        {segments.length === 1 && segments[0].type === 'text' ? (
          <div className="whitespace-pre-wrap leading-relaxed">
            {renderInlineCode(segments[0].content)}
          </div>
        ) : (
          <div className="leading-relaxed">
            {segments.map((seg, i) =>
              seg.type === 'code' ? (
                <CodeBlock key={`code-${i}`} code={seg.content} lang={seg.lang} />
              ) : (
                <div key={`txt-${i}`} className="whitespace-pre-wrap mb-1">
                  {renderInlineCode(seg.content)}
                </div>
              )
            )}
          </div>
        )}
        <div className={`mt-1 text-[10px] ${isUser ? 'text-white/70' : 'text-neutral-500'}`}>{time}</div>
      </div>
    </div>
  )
}
