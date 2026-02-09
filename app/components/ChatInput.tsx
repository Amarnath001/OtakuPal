"use client";

import { useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 rounded-xl border border-otaku-border bg-otaku-card focus-within:ring-2 focus-within:ring-otaku-accent">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Tell me what you like..."
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none"
          disabled={disabled}
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-otaku-accent px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
