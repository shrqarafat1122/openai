"use client";

import { useRef, useState } from "react";

export function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  }

  return (
    <div className="border-t border-zinc-800/40 bg-zinc-950/20 backdrop-blur-md p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          placeholder="Send a message…"
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-52 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-650 outline-none focus:border-violet-500/80 transition-all font-sans"
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-650 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition-all shadow-glow-purple select-none hover:opacity-95"
        >
          Send
        </button>
      </div>
    </div>
  );
}
