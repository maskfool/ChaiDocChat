// src/loaders/fromPdf.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
export async function fromPdf(filePath) {
  const loader = new PDFLoader(filePath, {
    // parsedItemSeparator: "", // optional
  })
  return loader.load() // returns LangChain Document[]
}
