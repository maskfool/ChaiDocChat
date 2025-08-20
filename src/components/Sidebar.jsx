import React, { useRef, useState } from 'react'
import { prettyBytes } from '../utils/bytes'

export default function Sidebar({ uploads, addFiles, addText, addUrl }) {
  const fileRef = useRef(null)
  const [snippet, setSnippet] = useState('')
  const [url, setUrl] = useState('')

  function onDrop(e) {
    e.preventDefault()
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer hover:bg-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-2xl">⬆️</div>
        <div className="font-medium">Drop files here or click to browse</div>
        <div className="mt-1 text-xs text-neutral-500">Supports PDF, TXT, DOCX, and more ✨</div>
        <input
          ref={fileRef}
          className="hidden"
          type="file"
          multiple
          accept=".pdf,.txt,.csv,.json,.docx,.html"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Paste your text</div>
        <textarea
          className="h-28 w-full resize-none rounded-xl border px-3 py-2 text-sm"
          placeholder="Paste notes, articles, research…"
          value={snippet}
          onChange={(e)=>setSnippet(e.target.value)}
        />
        <button
          onClick={()=>{ if(snippet.trim()){ addText(snippet); setSnippet('') } }}
          className="mt-3 w-full rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
        >
          Add Text Content
        </button>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold">Share a website</div>
        <div className="flex items-center gap-2">
          <input
            type="url" value={url} onChange={(e)=>setUrl(e.target.value)}
            placeholder="https://example.com/docs"
            className="flex-1 rounded-xl border px-3 py-2 text-sm"
          />
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
            onClick={()=>{ if(url.trim()){ addUrl(url.trim()); setUrl('') } }}
          >
            Add
          </button>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold">Added items</div>
          <ul className="space-y-2 text-sm">
            {uploads.map(u => (
              <li key={u.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="truncate pr-2">
                  {u.kind === 'file' && '📄'}
                  {u.kind === 'text' && '📝'}
                  {u.kind === 'url' && '🔗'} {u.name}
                </span>
                <span className="text-xs text-neutral-500">{u.size ? prettyBytes(u.size) : null}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
