// src/utils/filetype.js
import path from "node:path"

const MAP = {
  ".pdf": "pdf",
  ".csv": "csv",
  ".json": "json",
  ".txt": "txt",
  ".md":  "txt",
}

export function getTypeFromPath(p) {
  const ext = path.extname(p).toLowerCase()
  return MAP[ext] || null
}
