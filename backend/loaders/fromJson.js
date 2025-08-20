// src/loaders/fromJson.js
import fs from "node:fs/promises"
import { Document } from "langchain/document"

/**
 * Convert JSON to Documents.
 * - If array: each item -> one Document
 * - If object: one Document with flattened lines
 */
export async function fromJson(filePath) {
  const raw = await fs.readFile(filePath, "utf-8")
  const data = JSON.parse(raw)

  if (Array.isArray(data)) {
    return data.map((item, i) => new Document({
      pageContent: flattenJson(item),
      metadata: { source: filePath, index: i },
    }))
  }
  // single object
  return [new Document({
    pageContent: flattenJson(data),
    metadata: { source: filePath },
  })]
}

// turn JSON object into readable lines
function flattenJson(obj, prefix = "") {
  if (obj === null || typeof obj !== "object") return String(obj)
  if (Array.isArray(obj)) {
    return obj.map((v, i) => flattenJson(v, `${prefix}[${i}]`)).join("\n")
  }
  return Object.entries(obj)
    .map(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === "object") return flattenJson(v, key)
      return `${key}: ${String(v)}`
    })
    .join("\n")
}
