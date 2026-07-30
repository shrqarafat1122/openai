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
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-bg p-2 focus-within:border-accent">
      {value.map((key, i) => (
        <span
          key={i}
          className="flex items-center gap-1.5 rounded-md bg-zinc-800/80 px-2 py-1 text-xs font-mono text-gray-200 transition-all hover:bg-zinc-700"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <Key className="h-3 w-3 text-gray-400" />
          <span>{maskKey(key, i)}</span>
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="text-gray-400 hover:text-red-400"
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
        className="flex-1 min-w-[150px] bg-transparent text-sm text-gray-200 outline-none placeholder:text-gray-500"
      />
    </div>
  );
}
