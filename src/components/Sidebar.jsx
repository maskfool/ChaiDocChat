import React, { useRef, useState } from 'react'
import { prettyBytes } from '../utils/bytes'

export default function Sidebar({ uploads, addFiles, addText, addUrl, addDocumentation, dark }) {
  const fileRef = useRef(null)
  const [snippet, setSnippet] = useState('')
  const [url, setUrl] = useState('')
  const [urlType, setUrlType] = useState('single') // 'single' or 'documentation'

  function onDrop(e) {
    e.preventDefault()
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const card = `rounded-2xl border p-4 shadow-sm ${dark ? 'border-white/20 bg-black/50' : 'border-neutral-200 bg-white'}`
  const inputBox = `rounded-xl border px-3 py-2 text-sm ${
    dark ? 'border-white/20 bg-black/40 text-neutral-100' : 'border-neutral-300 bg-white text-neutral-800'
  }`
  const btn = `rounded-xl border px-3 py-2 text-sm ${
    dark ? 'border-white/20 bg-black/40 hover:bg-black/60' : 'border-neutral-300 bg-white hover:bg-neutral-50'
  }`

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer ${dark ? 'border-white/20 hover:bg-black/40' : 'border-neutral-300 hover:bg-neutral-100'}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${dark ? 'bg-white/10 text-2xl' : 'bg-neutral-100 text-2xl'}`}>⬆️</div>
        <div className="font-medium">Drop files here or click to browse</div>
        <div className={`${dark ? 'text-neutral-400' : 'text-neutral-500'} mt-1 text-xs`}>Supports PDF, TXT, DOCX, and more ✨</div>
        <input ref={fileRef} className="hidden" type="file" multiple onChange={(e)=>addFiles(e.target.files)} />
      </div>

      <div className={card}>
        <div className="mb-2 text-sm font-semibold">Paste your text</div>
        <textarea
          className={`h-28 w-full resize-none ${inputBox}`}
          placeholder="Paste notes, articles, research…"
          value={snippet}
          onChange={(e)=>setSnippet(e.target.value)}
        />
        <button
          onClick={()=>{ if(snippet.trim()){ addText(snippet); setSnippet('') } }}
          className={`${btn} mt-3 w-full`}
        >
          Add Text Content
        </button>
      </div>

      <div className={card}>
        <div className="mb-3 text-sm font-semibold">Add Web Content</div>
        
        {/* URL Type Toggle */}
        <div className={`mb-3 flex rounded-lg border p-1 ${dark ? 'border-white/20 bg-black/40' : 'border-neutral-300 bg-neutral-100'}`}>
          <button
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              urlType === 'single' 
                ? (dark ? 'bg-white text-black' : 'bg-white text-black shadow-sm')
                : (dark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-800')
            }`}
            onClick={() => setUrlType('single')}
          >
            Single Page
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              urlType === 'documentation' 
                ? (dark ? 'bg-white text-black' : 'bg-white text-black shadow-sm')
                : (dark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-600 hover:text-neutral-800')
            }`}
            onClick={() => setUrlType('documentation')}
          >
            Full Website
          </button>
        </div>

        {/* URL Input */}
        <div className="space-y-3">
          <input
            type="url" 
            value={url} 
            onChange={(e)=>setUrl(e.target.value)}
            placeholder={
              urlType === 'single' 
                ? "https://example.com/article" 
                : "https://ai-sdk.dev/docs/introduction"
            }
            className={`w-full ${inputBox}`}
          />
          <button
            className={`${btn} w-full`}
            onClick={()=>{ 
              if(url.trim()){ 
                if(urlType === 'single') {
                  addUrl(url.trim())
                } else {
                  addDocumentation(url.trim())
                }
                setUrl('') 
              } 
            }}
          >
            {urlType === 'single' ? '🔗 Add Page' : '🕷️ Add Website'}
          </button>
        </div>
        
        <div className={`mt-2 text-xs ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
          {urlType === 'single' 
            ? 'Add a single webpage to your knowledge base'
            : 'Automatically crawls and indexes all pages from the website'
          }
        </div>
      </div>

      {uploads.length > 0 && (
        <div className={card}>
          <div className="mb-2 text-sm font-semibold">Added items</div>
          <ul className="space-y-2 text-sm">
            {uploads.map(u => (
              <li key={u.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${dark ? 'border-white/20' : 'border-neutral-200'}`}>
                <span className="truncate pr-2">
                  {u.kind === 'file' && '📄'}
                  {u.kind === 'text' && '📝'}
                  {u.kind === 'url' && '🔗'}
                  {u.kind === 'documentation' && '🌐'} {u.name}
                </span>
                <span className={`${dark ? 'text-neutral-400' : 'text-neutral-500'} text-xs`}>{u.size ? prettyBytes(u.size) : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}