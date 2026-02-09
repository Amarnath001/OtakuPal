"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { TasteProfileCard } from "./components/TasteProfileCard";
import { VoiceWebSpeech } from "./components/VoiceWebSpeech";
import type { Preferences } from "@/lib/preferences";
import type { RecommendationItem } from "@/lib/recommender";

const SESSION_KEY = "otakupal_session_id";
const EXAMPLE_PROMPT =
  "I liked Vinland Saga and Berserk, want something dark but not too depressing.";

interface Message {
  role: "user" | "assistant";
  content: string;
  recommendations?: RecommendationItem[] | null;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [streamingRecs, setStreamingRecs] = useState<RecommendationItem[] | null>(null);

  const loadSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: { role: string; content: string }[];
        preferences: Preferences | null;
      };
      setMessages(
        data.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
      setPreferences(data.preferences ?? null);
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const id = typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    if (id) {
      setSessionId(id);
      loadSession(id);
    }
  }, [loadSession]);

  const startNewChat = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([]);
    setPreferences(null);
    setStreamingContent(null);
    setStreamingRecs(null);
  }, []);

  const simulateStreaming = useCallback(
    (fullText: string, recs: RecommendationItem[] | null, onDone: () => void) => {
      setStreamingContent("");
      setStreamingRecs(null);
      let i = 0;
      const step = 2;
      const interval = setInterval(() => {
        i += step;
        if (i >= fullText.length) {
          clearInterval(interval);
          setStreamingContent(fullText);
          setStreamingRecs(recs);
          setTimeout(() => {
            setStreamingContent(null);
            setStreamingRecs(null);
            onDone();
          }, 0);
          return;
        }
        setStreamingContent(fullText.slice(0, i));
      }, 20);
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text }),
        });
        if (!res.ok) throw new Error("Chat failed");
        const data = (await res.json()) as {
          sessionId: string;
          assistantMessage: string;
          preferences: Preferences;
          recommendations: RecommendationItem[] | null;
        };
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
          if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, data.sessionId);
        }
        setPreferences(data.preferences);
        simulateStreaming(
          data.assistantMessage,
          data.recommendations ?? null,
          () => {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: data.assistantMessage,
                recommendations: data.recommendations ?? null,
              },
            ]);
            setLoading(false);
          }
        );
      } catch (_) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Please try again." },
        ]);
        setLoading(false);
      }
    },
    [sessionId, simulateStreaming]
  );

  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      sendMessage(transcript);
    },
    [sendMessage]
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col p-4 md:p-6">
      <header className="mb-4 flex items-center justify-between border-b border-otaku-border pb-4">
        <h1 className="text-xl font-bold text-zinc-100">OtakuPal</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startNewChat}
            className="rounded-lg border border-otaku-border bg-otaku-card px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-otaku-border hover:text-zinc-200"
          >
            New chat
          </button>
          <span className="text-sm text-otaku-muted">Anime · Manga · Manhwa</span>
        </div>
      </header>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-otaku-border bg-otaku-bg/50 p-4">
            {messages.length === 0 && !streamingContent && (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <p className="text-zinc-400">
                  Tell me what you like and I’ll suggest anime or manga that fits.
                </p>
                <button
                  type="button"
                  onClick={() => sendMessage(EXAMPLE_PROMPT)}
                  className="rounded-lg border border-otaku-border bg-otaku-card px-4 py-2 text-sm text-zinc-300 hover:bg-otaku-border"
                >
                  Try example prompt
                </button>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage
                key={i}
                role={m.role}
                content={m.content}
                recommendations={m.recommendations}
              />
            ))}
            {streamingContent !== null && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                recommendations={streamingRecs}
                isStreaming
              />
            )}
          </div>
          <div className="mt-4 space-y-4">
            <VoiceWebSpeech onSendTranscript={handleVoiceTranscript} disabled={loading} />
            <ChatInput onSend={sendMessage} disabled={loading} />
          </div>
        </div>
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-4">
            <TasteProfileCard preferences={preferences} />
          </div>
        </aside>
      </div>
      <div className="mt-4 md:hidden">
        <TasteProfileCard preferences={preferences} />
      </div>
    </div>
  );
}
