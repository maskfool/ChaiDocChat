// src/components/CodeBlock.jsx
import React, { useState } from "react";

export default function CodeBlock({ code = "", lang = "", dark = false }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  const getLanguageIcon = (lang) => {
    const icons = {
      'javascript': '🟨',
      'js': '🟨',
      'typescript': '🔷',
      'ts': '🔷',
      'python': '🐍',
      'py': '🐍',
      'json': '📄',
      'html': '🌐',
      'css': '🎨',
      'bash': '💻',
      'shell': '💻',
      'sql': '🗄️',
      'yaml': '⚙️',
      'yml': '⚙️',
      'markdown': '📝',
      'md': '📝',
      'dockerfile': '🐳',
      'docker': '🐳',
      'git': '📦',
      'default': '💻'
    };
    return icons[lang?.toLowerCase()] || icons.default;
  };

  return (
    <div className="group relative my-4">
      {/* Header with language and copy button */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-t-xl border-b ${
        dark 
          ? 'bg-gray-800 border-gray-700 text-gray-300' 
          : 'bg-gray-100 border-gray-200 text-gray-600'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{getLanguageIcon(lang)}</span>
          <span className="text-xs font-medium uppercase tracking-wider">
            {lang || "code"}
          </span>
        </div>
        <button
          onClick={copy}
          className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-all duration-200 ${
            copied
              ? 'bg-green-500 text-white'
              : dark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                : 'bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 border border-gray-300'
          }`}
        >
          {copied ? (
            <>
              <span>✓</span>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content */}
      <pre className={`overflow-x-auto overflow-y-auto max-h-[60vh] rounded-b-xl border-t-0 ${
        dark 
          ? 'bg-gray-900 text-gray-100 border-gray-700' 
          : 'bg-gray-950 text-gray-100 border-gray-200'
      } text-sm p-4`}>
        <code className="whitespace-pre break-words font-mono leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
