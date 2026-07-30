"use client";

import React, { useState } from "react";
import { X, Key } from "lucide-react";

interface KeyTagInputProps {
  value: string[];
  onChange: (keys: string[]) => void;
  placeholder?: string;
}

export function KeyTagInput({ value, onChange, placeholder = "Add key..." }: KeyTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      const last = value[value.length - 1];
      onChange(value.slice(0, -1));
      setInputValue(last);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const keysParsed = pasteData
      .split(/[\s,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const merged = [...value];
    keysParsed.forEach((k) => {
      if (!merged.includes(k)) merged.push(k);
    });
    onChange(merged);
    setInputValue("");
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const maskKey = (key: string, index: number) => {
    if (hoveredIndex === index) return key;
    if (key.length <= 8) return "••••••••";
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 backdrop-blur-sm focus-within:border-violet-500 focus-within:shadow-glow-purple transition-all">
      {value.map((key, i) => (
        <span
          key={i}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 px-2.5 py-1.5 text-xs font-mono text-zinc-200 transition-all hover:bg-zinc-800/50 hover:border-violet-500/30"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <Key className="h-3 w-3 text-violet-400" />
          <span>{maskKey(key, i)}</span>
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-zinc-500 hover:text-red-400 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[150px] bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600 font-sans"
      />
    </div>
  );
}
