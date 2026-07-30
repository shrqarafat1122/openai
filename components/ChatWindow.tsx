"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble, type ChatMessage } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ModelPicker } from "./ModelPicker";
import { Sidebar } from "./Sidebar";

export function ChatWindow() {
  const [models, setModels] = useState<Array<{ id: string; providerName?: string }>>([]);
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
        const items = d.models ?? [];
        setModels(items);
        const ids = items.map((m: { id: string }) => m.id);
        setModel((cur) => cur || ids.find((i: string) => i.endsWith("gpt-4o-mini") || i.endsWith("claude-3-5-sonnet-20241022")) || ids[0] || "");
      })
      .catch(() => setError("Couldn't load models. Link your provider keys in Settings -> Linked providers."));
  }, []);

  // Keep the transcript pinned to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    if (!model || streaming) return;
    setError(null);

    if (model.includes("CONFIG_REQUIRED") || model.includes("FETCH_ERROR")) {
      setError("The selected provider needs manual model IDs or is unreachable. Configure it in Settings -> Linked providers.");
      return;
    }

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
    <div className="flex h-screen bg-[#07070B] text-zinc-100 antialiased font-sans">
      <Sidebar onNewChat={() => setMessages([])} userEmail={email} />

      <main className="flex flex-1 flex-col bg-[#07070B]/95">
        <header className="flex items-center justify-between border-b border-zinc-800/40 bg-zinc-950/20 backdrop-blur-md px-6 py-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#a78bfa]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200">AI Gateway Router</span>
          </div>
          <ModelPicker
            models={models}
            value={model}
            onChange={setModel}
            disabled={streaming}
          />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.length === 0 && (
              <div className="mt-28 text-center flex flex-col items-center justify-center">
                <div className="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4 shadow-glow-purple">
                  <span className="text-xs font-semibold text-violet-400 font-mono">&gt;_</span>
                </div>
                <h2 className="text-sm font-medium text-zinc-350 mb-1">Establish connection</h2>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Start conversing using any linked models from OpenAI, Anthropic, or configured custom gateways.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {error && (
              <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3.5 py-2.5 text-xs text-red-300 shadow-md">
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
