import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

export async function fromCsv(filePath) {
  const loader = new CSVLoader(filePath);
  return loader.load();
}
