"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble, type ChatMessage } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ModelPicker } from "./ModelPicker";
import { Sidebar } from "./Sidebar";

export function ChatWindow() {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load the current user and available models on mount.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.user?.email && setEmail(d.user.email))
      .catch(() => {});

    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const ids: string[] = (d.models ?? []).map((m: { id: string }) => m.id);
        setModels(ids);
        setModel((cur) => cur || ids.find((i) => i === "gpt-4o-mini") || ids[0] || "");
      })
      .catch(() => setError("Couldn't load models. Check the OpenAI key on the server."));
  }, []);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    if (!model || streaming) return;
    setError(null);

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    // Append the user's turn plus an empty assistant turn we'll stream into.
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: next }),
      });

      if (!res.ok || !res.body) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Parse the SSE stream: lines of `data: <json>` ending with `data: [DONE]`.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;

          let chunk: unknown;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          const c = chunk as {
            error?: { message?: string };
            choices?: { delta?: { content?: string } }[];
          };
          if (c.error) throw new Error(c.error.message ?? "Stream error");

          const delta = c.choices?.[0]?.delta?.content;
          if (delta) {
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              copy[copy.length - 1] = { ...last, content: last.content + delta };
              return copy;
            });
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      // Drop the empty/partial assistant bubble if nothing streamed in.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar onNewChat={() => setMessages([])} userEmail={email} />

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">AI Gateway</span>
          <ModelPicker
            models={models}
            value={model}
            onChange={setModel}
            disabled={streaming}
          />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.length === 0 && (
              <div className="mt-20 text-center text-sm text-gray-500">
                Start a conversation with your models.
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>

        <MessageInput onSend={send} disabled={streaming || !model} />
      </main>
    </div>
  );
}
