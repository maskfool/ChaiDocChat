import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import { uploadFile, uploadText, uploadUrl } from "./api/upload";
import { askQuestion } from "./api/chat";

export default function App() {
  const [uploads, setUploads] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: 'Hanjiii, kya madat karni hai aapki? Upload docs ya text/URL bhejo, aur sawal pucho. 😃',
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  function addSystemMessage(text, customId = Date.now()) {
    setMessages((m) => [...m, { id: customId, role: "system", text, time: now() }]);
    return customId;
  }
  function updateSystemMessage(id, newText) {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: newText, time: now() } : msg)));
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    files.forEach(async (f) => {
      setUploads((u) => [...u, { id: f.name, kind: "file", name: f.name, size: f.size }]);
      const pendingId = Date.now() + Math.random();
      addSystemMessage(`⏳ Uploading & scanning file "${f.name}"...`, pendingId);
      try {
        await uploadFile(f);
        updateSystemMessage(pendingId, `✅ File "${f.name}" uploaded & indexed successfully!`);
      } catch {
        updateSystemMessage(pendingId, `❌ File "${f.name}" upload failed.`);
      }
    });
  }

  async function addText(text) {
    if (!text.trim()) return;
    setUploads((u) => [...u, { id: `txt-${Date.now()}`, kind: "text", name: text.slice(0, 40) }]);
    const pendingId = Date.now() + Math.random();
    addSystemMessage("⏳ Processing your text snippet...", pendingId);
    try {
      await uploadText(text);
      updateSystemMessage(pendingId, "✅ Text snippet added & processed successfully!");
    } catch {
      updateSystemMessage(pendingId, "❌ Failed to process text snippet.");
    }
  }

  async function addUrl(url) {
    if (!url.trim()) return;
    setUploads((u) => [...u, { id: `url-${Date.now()}`, kind: "url", name: url }]);
    const pendingId = Date.now() + Math.random();
    addSystemMessage(`⏳ Crawling & scanning URL "${url}"...`, pendingId);
    try {
      await uploadUrl(url);
      updateSystemMessage(pendingId, `✅ URL "${url}" crawled & indexed successfully!`);
    } catch {
      updateSystemMessage(pendingId, `❌ Failed to process URL "${url}".`);
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    const userId = Date.now();
    const pendingId = userId + 1;
    setMessages((m) => [
      ...m,
      { id: userId, role: "user", text, time: now() },
      { id: pendingId, role: "assistant", text: "⏳ Thinking...", time: now() },
    ]);
    try {
      const res = await askQuestion(text);
      setMessages((m) => m.map((msg) => (msg.id === pendingId ? { ...msg, text: res.answer } : msg)));
    } catch {
      setMessages((m) =>
        m.map((msg) => (msg.id === pendingId ? { ...msg, text: "❌ Chat request failed. Please try again." } : msg))
      );
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col paper-grid">
      <header className={`h-14 border-b flex items-center justify-between px-4 ${dark ? "bg-black/70 border-white/10 text-neutral-100" : "bg-white/70 border-neutral-200 text-neutral-800"}`}>
        <div className="flex items-center gap-2">
          <div className={`h-6 w-6 grid place-items-center rounded-md text-xs font-bold ${dark ? "bg-white text-black" : "bg-neutral-900 text-white"}`}>AI</div>
          <h1 className="font-semibold">Drop your knowledge here</h1>
        </div>
        <button
          onClick={() => setDark(d => !d)}
          className={`rounded-lg px-3 py-1 text-sm border ${dark ? "border-white/20 hover:bg-white/10" : "border-neutral-300 hover:bg-neutral-100"}`}
        >
          {dark ? "☀️ Light" : "🌙 Dark"}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className={`w-[340px] border-r p-4 overflow-y-auto ${dark ? "bg-black/40 border-white/10" : "bg-neutral-50/70 border-neutral-200"}`}>
          <Sidebar dark={dark} uploads={uploads} addFiles={addFiles} addText={addText} addUrl={addUrl} />
        </aside>

        <section className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className={`border-b px-4 py-3 ${dark ? "bg-black/50 border-white/10" : "bg-white/70 border-neutral-200"}`}>
            <div className="text-sm font-medium">Chat with your documents</div>
            <div className={`${dark ? "text-neutral-400" : "text-neutral-500"} text-xs`}>Upload documents to start chatting</div>
          </div>
          <ChatArea dark={dark} messages={messages} onSend={sendMessage} />
        </section>
      </div>
    </div>
  );
}