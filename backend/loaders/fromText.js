// TextLoader is exported from the core "langchain" package (not community)
import { TextLoader } from "langchain/document_loaders/fs/text";

export async function fromText(filePath) {
  const loader = new TextLoader(filePath, { encoding: "utf-8" });
  return loader.load();
}
