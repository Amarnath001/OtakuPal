"use client";

import Image from "next/image";
import type { RecommendationItem } from "@/lib/recommender";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  recommendations?: RecommendationItem[] | null;
  isStreaming?: boolean;
}

function renderMarkdownLight(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = boldRegex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index));
    }
    parts.push(<strong key={key++} className="font-semibold">{m[1]}</strong>);
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}

export function ChatMessage({ role, content, recommendations, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
          isUser ? "bg-otaku-accent text-white" : "bg-otaku-card border border-otaku-border text-zinc-200"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">
          {renderMarkdownLight(content)}
          {isStreaming && <span className="animate-pulse">▌</span>}
        </div>
        {recommendations && recommendations.length > 0 && (
          <div className="mt-3 space-y-3 border-t border-otaku-border pt-3">
            {recommendations.map((r) => (
              <div key={r.id} className="flex gap-3 rounded-lg bg-otaku-bg/50 p-2">
                {r.coverImage && (
                  <Image
                    src={r.coverImage}
                    alt=""
                    width={56}
                    height={80}
                    className="h-20 w-14 shrink-0 rounded object-cover"
                    unoptimized
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-100">{r.title}</p>
                  <p className="text-xs text-otaku-muted">
                    {[r.format, r.episodes != null ? `${r.episodes} eps` : r.chapters != null ? `${r.chapters} ch` : ""].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">{r.whyFits}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
