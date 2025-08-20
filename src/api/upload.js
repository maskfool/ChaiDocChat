import api from "./index";

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/ingest/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadText(text) {
  const res = await api.post("/api/ingest/text", { text });
  return res.data;
}

export async function uploadUrl(url) {
  const res = await api.post("/api/ingest/url", { url });
  return res.data;
}
