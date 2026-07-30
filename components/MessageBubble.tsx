"use client";

import ReactMarkdown from "react-markdown";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in-30 slide-in-from-bottom-1 duration-200`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-gradient-to-r from-violet-600 to-indigo-650 text-white shadow-glow-purple border border-violet-500/20"
            : "border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-sm text-zinc-100"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap leading-relaxed">{message.content}</span>
        ) : (
          <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950/80 prose-pre:border prose-pre:border-zinc-800 prose-pre:p-3 prose-pre:rounded-lg">
            {message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <span className="flex gap-1 py-1 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce delay-100" />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce delay-200" />
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce delay-300" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
