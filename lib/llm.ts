/**
 * LLM integration (Gemini) for anime chat with taste profile context.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Preferences } from "./preferences";
import type { RecommendationItem } from "./recommender";
import { logger } from "./logger";

const log = logger.child("llm");

function buildSystemPrompt(prefs: Preferences, recs: RecommendationItem[] | null): string {
  const parts: string[] = [
    "You are OtakuPal, a friendly anime and manga recommendation assistant.",
    "You know about anime, manga, and manhwa.",
    "Use the user's taste profile to personalize responses.",
  ];
  let fmt = "anime or manga";
  if (prefs.preferredFormat === "ANIME") fmt = "anime";
  else if (prefs.preferredFormat === "MANGA") fmt = "manga";
  parts.push(`Preferred format: ${fmt}.`);
  if (prefs.likedGenres.length)
    parts.push(`Likes genres: ${prefs.likedGenres.join(", ")}.`);
  if (prefs.dislikedGenres.length)
    parts.push(`Avoids genres: ${prefs.dislikedGenres.join(", ")}.`);
  if (prefs.examplesLiked.length)
    parts.push(`Likes titles: ${prefs.examplesLiked.join(", ")}.`);
  if (prefs.mood) parts.push(`Mood: ${prefs.mood}.`);
  if (prefs.noGoFilters.length)
    parts.push(`Strictly avoid: ${prefs.noGoFilters.join(", ")}.`);

  const hasRecs = recs && recs.length > 0;
  if (hasRecs) {
    parts.push("\nHere are AniList recommendations that match the user. Format them naturally in your reply:");
  } else {
    parts.push("\nThe user hasn't given enough info yet. Ask one short, friendly clarifying question. Don't recommend yet.");
  }
  if (hasRecs && recs) {
    for (let i = 0; i < recs.length; i++) {
      const r = recs[i];
      const meta = r.format ?? "";
      const eps = r.episodes != null ? `${r.episodes} eps` : r.chapters != null ? `${r.chapters} ch` : "";
      parts.push(`${i + 1}. **${r.title}** (${[meta, eps].filter(Boolean).join(", ")}) – ${r.whyFits}`);
    }
  }
  parts.push("\nBe conversational, brief, and helpful. Use markdown for titles.");
  return parts.join("\n");
}

function formatChatHistory(messages: { role: string; content: string }[]): string {
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

export interface LLMInput {
  userMessage: string;
  preferences: Preferences;
  chatHistory: { role: string; content: string }[];
  recommendations: RecommendationItem[] | null;
}

export async function generateReply(input: LLMInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    log.warn("GEMINI_API_KEY not set, returning fallback");
    return "I'd love to help with anime recommendations! Add GEMINI_API_KEY to enable the AI assistant.";
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelId = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const model = genAI.getGenerativeModel({ model: modelId });
    const systemPrompt = buildSystemPrompt(
      input.preferences,
      input.recommendations
    );
    const historyText =
      input.chatHistory.length > 0
        ? "\n\nPrevious conversation:\n" + formatChatHistory(input.chatHistory)
        : "";
    const fullPrompt = `${systemPrompt}${historyText}\n\nUser: ${input.userMessage}\nAssistant:`;
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    return text?.trim() ?? "Sorry, I couldn't generate a response.";
  } catch (err) {
    log.error("LLM error", {
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
