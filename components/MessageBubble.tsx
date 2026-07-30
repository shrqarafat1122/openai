"use client";

import ReactMarkdown from "react-markdown";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-accent text-white"
            : "border border-border bg-surface text-gray-100"
        }`}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="prose prose-invert max-w-none prose-p:my-2 prose-pre:my-2">
            {message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : (
              <span className="inline-block animate-pulse text-gray-500">…</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
