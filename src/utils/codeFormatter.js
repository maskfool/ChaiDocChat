// src/utils/codeFormatter.js

// Function to detect and extract code blocks from text
export function detectCodeBlocks(text) {
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  // Find all code blocks
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const [fullMatch, language, code] = match;
    const startIndex = match.index;
    
    // Add text before code block
    if (startIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, startIndex);
      if (beforeText.trim()) {
        parts.push(...formatTextWithHeadings(beforeText));
      }
    }
    
    // Add code block
    parts.push({
      type: 'code',
      content: code.trim(),
      language: language || 'text'
    });
    
    lastIndex = startIndex + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push(...formatTextWithHeadings(remainingText));
    }
  }
  
  // If no code blocks found, check for inline code and console.log
  if (parts.length === 0) {
    return formatInlineCode(text);
  }
  
  return parts;
}

// Function to format text with headings
export function formatTextWithHeadings(text) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = headingRegex.exec(text)) !== null) {
    const [fullMatch, hashes, headingText] = match;
    const startIndex = match.index;
    
    // Add text before heading
    if (startIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, startIndex);
      if (beforeText.trim()) {
        parts.push({ type: 'text', content: beforeText });
      }
    }
    
    // Add heading
    parts.push({
      type: 'heading',
      content: headingText,
      level: hashes.length
    });
    
    lastIndex = startIndex + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // If no headings found, return as text
  if (parts.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  return parts;
}

// Function to format inline code and console.log statements
export function formatInlineCode(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Find console.log statements
  const consoleLogRegex = /console\.log\([^)]*\)/g;
  while ((match = consoleLogRegex.exec(text)) !== null) {
    const [fullMatch] = match;
    const startIndex = match.index;
    
    // Add text before console.log
    if (startIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, startIndex);
      if (beforeText.trim()) {
        parts.push({ type: 'text', content: beforeText });
      }
    }
    
    // Add console.log as code block
    parts.push({
      type: 'code',
      content: fullMatch,
      language: 'javascript'
    });
    
    lastIndex = startIndex + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // If no console.log found, check for JSON objects
  if (parts.length === 0) {
    return formatJSONObjects(text);
  }
  
  return parts;
}

// Function to format JSON objects
export function formatJSONObjects(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Find JSON objects
  const jsonRegex = /\{[\s\S]*?\}/g;
  while ((match = jsonRegex.exec(text)) !== null) {
    const [fullMatch] = match;
    const startIndex = match.index;
    
    // Add text before JSON
    if (startIndex > lastIndex) {
      const beforeText = text.slice(lastIndex, startIndex);
      if (beforeText.trim()) {
        parts.push({ type: 'text', content: beforeText });
      }
    }
    
    // Try to parse as JSON to validate
    try {
      JSON.parse(fullMatch);
      parts.push({
        type: 'code',
        content: JSON.stringify(JSON.parse(fullMatch), null, 2),
        language: 'json'
      });
    } catch {
      // If not valid JSON, add as text
      parts.push({ type: 'text', content: fullMatch });
    }
    
    lastIndex = startIndex + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // If no JSON found, return as text
  if (parts.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  return parts;
}

// Function to detect language from content
export function detectLanguage(content, language) {
  if (language) return language;
  
  const contentLower = content.toLowerCase();
  
  if (contentLower.includes('console.log') || contentLower.includes('function') || contentLower.includes('const ') || contentLower.includes('let ')) {
    return 'javascript';
  }
  if (contentLower.includes('import ') || contentLower.includes('export ') || contentLower.includes('interface ')) {
    return 'typescript';
  }
  if (contentLower.includes('def ') || contentLower.includes('import ') || contentLower.includes('print(')) {
    return 'python';
  }
  if (contentLower.includes('SELECT ') || contentLower.includes('FROM ') || contentLower.includes('WHERE ')) {
    return 'sql';
  }
  if (contentLower.includes('docker') || contentLower.includes('FROM ') || contentLower.includes('RUN ')) {
    return 'dockerfile';
  }
  if (contentLower.includes('curl ') || contentLower.includes('wget ') || contentLower.includes('npm ')) {
    return 'bash';
  }
  if (content.startsWith('{') && content.endsWith('}')) {
    return 'json';
  }
  
  return 'text';
}
