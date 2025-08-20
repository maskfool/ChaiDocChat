import api from "./index";

export async function askQuestion(query) {
  const res = await api.post("/api/chat", { query });
  return res.data;
}
