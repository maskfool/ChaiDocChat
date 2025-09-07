import api from "./index";

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/ingest/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadText(text) {
  const res = await api.post("/ingest/text", { text });
  return res.data;
}

export async function uploadUrl(url, options = {}) {
  const { depth = 1, maxPages = 10, enhanced = false } = options;
  const res = await api.post("/ingest/url", { 
    url, 
    depth, 
    maxPages, 
    enhanced 
  });
  return res.data;
}

export async function uploadDocumentation(url, options = {}) {
  const { maxPages = 100, maxDepth = 4 } = options;
  const res = await api.post("/ingest/documentation", { 
    url, 
    maxPages, 
    maxDepth 
  });
  return res.data;
}
