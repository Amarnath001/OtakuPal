"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window.SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)
    : undefined;

/** After this many ms of no new *final* result, auto-send transcript (avoids reset from noise interims) */
const PAUSE_MS = 2500;
/** Min chars to auto-send (avoids sending noise fragments like "the" or "um") */
const MIN_TRANSCRIPT_LEN = 12;

interface VoiceWebSpeechProps {
  onSendTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceWebSpeech({ onSendTranscript, disabled }: VoiceWebSpeechProps) {
  const [connectionState, setConnectionState] = useState<"idle" | "listening" | "error">("idle");
  const [transcript, setTranscript] = useState("");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef("");
  const onSendRef = useRef(onSendTranscript);
  onSendRef.current = onSendTranscript;

  const stopVoice = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.abort();
      } catch (_) {
        // ignore
      }
      recognitionRef.current = null;
    }
    transcriptRef.current = "";
    setConnectionState("idle");
  }, []);

  const startRecognition = useCallback(() => {
    if (!SpeechRecognitionAPI || !recognitionRef) return;
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    const existing = recognitionRef.current;
    if (existing) {
      try {
        existing.abort();
      } catch (_) {
        // ignore
      }
      recognitionRef.current = null;
    }
    transcriptRef.current = "";
    setTranscript("");

    const rec = new SpeechRecognitionAPI() as SpeechRecognition;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let full = "";
      let hasFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript?.trim() ?? "";
        if (text) full += (full ? " " : "") + text;
        if (res.isFinal) hasFinal = true;
      }
      if (full) {
        transcriptRef.current = full;
        setTranscript(full);
        if (hasFinal) {
          if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
          }
          pauseTimerRef.current = setTimeout(() => {
            pauseTimerRef.current = null;
            const t = transcriptRef.current.trim();
            if (t.length >= MIN_TRANSCRIPT_LEN) {
              onSendRef.current(t);
              startRecognition();
            }
          }, PAUSE_MS);
        }
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setErrorDetail(event.error === "not-allowed" ? "Microphone access denied." : `Speech error: ${event.error}`);
      setConnectionState("error");
      recognitionRef.current = null;
    };

    rec.onend = () => {
      if (recognitionRef.current === rec) {
        recognitionRef.current = null;
        setConnectionState("idle");
      }
    };

    try {
      rec.start();
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "Failed to start speech recognition");
      setConnectionState("error");
      recognitionRef.current = null;
    }
  }, []);

  const startVoice = useCallback(() => {
    if (connectionState === "listening") return;
    if (!SpeechRecognitionAPI) {
      setErrorDetail("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      setConnectionState("error");
      return;
    }
    setErrorDetail(null);
    setConnectionState("listening");
    startRecognition();
  }, [connectionState, startRecognition]);

  useEffect(() => () => stopVoice(), [stopVoice]);

  const handleToggle = useCallback(() => {
    if (connectionState === "listening") {
      stopVoice();
    } else if (connectionState === "idle" || connectionState === "error") {
      startVoice();
    }
  }, [connectionState, startVoice, stopVoice]);

  const handleSendToChat = useCallback(() => {
    const text = transcript.trim();
    if (text) {
      onSendTranscript(text);
      if (connectionState === "listening") {
        startRecognition();
      } else {
        setTranscript("");
        transcriptRef.current = "";
      }
    }
  }, [transcript, connectionState, onSendTranscript, startRecognition]);

  const statusLabel =
    connectionState === "listening" ? "Listening…" : connectionState === "error" ? "Error" : "Idle";

  return (
    <div className="rounded-xl border border-otaku-border bg-otaku-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            connectionState === "listening"
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : "bg-otaku-accent/20 text-otaku-accent hover:bg-otaku-accent/30"
          } disabled:opacity-50`}
        >
          {connectionState === "listening" ? "Stop Voice" : "Start Voice"}
        </button>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            connectionState === "listening"
              ? "bg-emerald-500/20 text-emerald-400"
              : connectionState === "error"
                ? "bg-red-500/20 text-red-400"
                : "bg-otaku-border text-otaku-muted"
          }`}
        >
          {statusLabel}
        </span>
        {errorDetail && <span className="text-xs text-red-400">{errorDetail}</span>}
      </div>
      {(transcript || connectionState === "listening") && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-zinc-400">Live transcript</p>
          <p className="min-h-[2.5rem] rounded-lg bg-otaku-bg/50 p-3 text-sm text-zinc-200">
            {transcript || "Listening…"}
          </p>
          <button
            type="button"
            onClick={handleSendToChat}
            className="mt-2 rounded-lg bg-otaku-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Send transcript to chat
          </button>
        </div>
      )}
    </div>
  );
}
