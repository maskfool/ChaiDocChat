import React, { useState } from "react";
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

  function addSystemMessage(text) {
    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { id: Date.now(), role: "system", text, time: now() }]);
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    files.forEach(async (f) => {
      setUploads((u) => [...u, { id: f.name, kind: "file", name: f.name, size: f.size }]);
      try {
        await uploadFile(f);
        addSystemMessage(`✅ File "${f.name}" uploaded & indexed successfully!`);
      } catch (err) {
        console.error("File upload failed:", err);
        addSystemMessage(`❌ File "${f.name}" upload failed.`);
      }
    });
  }

  async function addText(text) {
    if (!text.trim()) return;
    setUploads((u) => [...u, { id: `txt-${Date.now()}`, kind: "text", name: text.slice(0, 40) }]);
    try {
      await uploadText(text);
      addSystemMessage("✅ Text snippet added & processed successfully!");
    } catch (err) {
      console.error("Text upload failed:", err);
      addSystemMessage("❌ Failed to process text snippet.");
    }
  }

  async function addUrl(url) {
    if (!url.trim()) return;
    setUploads((u) => [...u, { id: `url-${Date.now()}`, kind: "url", name: url }]);
    try {
      await uploadUrl(url);
      addSystemMessage(`✅ URL "${url}" crawled & indexed successfully!`);
    } catch (err) {
      console.error("URL upload failed:", err);
      addSystemMessage(`❌ Failed to process URL "${url}".`);
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;

    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { id: Date.now(), role: "user", text, time: now() };

    setMessages((m) => [...m, userMsg]);

    try {
      const res = await askQuestion(text);
      const aiMsg = { id: Date.now() + 1, role: "assistant", text: res.answer, time: now() };
      setMessages((m) => [...m, aiMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      addSystemMessage("❌ Chat request failed. Please try again.");
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-800 flex flex-col">
      <header className="h-14 border-b bg-white/70 backdrop-blur flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 grid place-items-center rounded-md bg-neutral-900 text-white text-xs font-bold">AI</div>
          <h1 className="font-semibold">Drop your knowledge here</h1>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-[340px] border-r bg-neutral-50/70 p-4 overflow-y-auto">
          <Sidebar uploads={uploads} addFiles={addFiles} addText={addText} addUrl={addUrl} />
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          <div className="border-b px-4 py-3 bg-white/70 backdrop-blur">
            <div className="text-sm font-medium">Chat with your documents</div>
            <div className="text-xs text-neutral-500">Upload documents to start chatting</div>
          </div>
          <ChatArea messages={messages} onSend={sendMessage} />
        </section>
      </div>
    </div>
  );
}
