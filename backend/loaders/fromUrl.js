// src/loaders/fromUrl.js
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

export async function fromUrl(url) {
  const loader = new CheerioWebBaseLoader(url, {
    
  });
  const docs = await loader.load();
  
  return docs.map(d => {
    d.metadata = { ...(d.metadata || {}), source: url };
    return d;
  });
}
