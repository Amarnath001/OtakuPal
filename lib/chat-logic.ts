import type { Preferences } from "./preferences";
import { EMPTY_PREFERENCES, mergePreferences, extractPreferencesFromMessage } from "./preferences";
import { getRecommendations, type RecommendationItem } from "./recommender";
import { generateReply } from "./llm";
import type { MediaType } from "./anilist";
import { getGenresForTitle } from "./anilist";
import { logger } from "./logger";

const log = logger.child("chat-logic");

/** Infer liked genres from titles the user mentioned (e.g. "Frieren") via AniList. */
async function inferGenresFromTitles(
  titles: string[],
  type: MediaType
): Promise<string[]> {
  const allGenres = new Set<string>();
  const toFetch = titles.slice(0, 4);
  for (const title of toFetch) {
    try {
      const { genres } = await getGenresForTitle(title, type);
      genres.forEach((g) => allGenres.add(g));
    } catch {
      // ignore per-title failures
    }
  }
  return Array.from(allGenres);
}

/** Next question based on what we're missing; never asks "what genres?" if we can infer from titles. */
function getNextQuestion(prefs: Preferences): string | null {
  if (prefs.questionCount >= 6) return null;
  if (!prefs.preferredFormat)
    return "Do you want recommendations for **anime**, **manga**, or both?";
  if (prefs.likedGenres.length === 0 && prefs.examplesLiked.length === 0)
    return "Any favorite anime or manga? (e.g. Frieren, Vinland Saga) I’ll use that to match your taste.";
  if (prefs.questionCount <= 2)
    return "Any genres or themes you’d rather avoid? (e.g. ecchi, horror)";
  if (!prefs.mood)
    return "Do you prefer darker/serious stories or lighter/fun ones?";
  if (prefs.questionCount < 5)
    return "Anything else? (e.g. short or long series, recent or classic)";
  return null;
}

function shouldAskMore(prefs: Preferences): boolean {
  if (prefs.questionCount >= 6) return false;
  const hasEnough =
    prefs.preferredFormat && (prefs.likedGenres.length > 0 || prefs.examplesLiked.length > 0);
  if (prefs.questionCount >= 3 || hasEnough) return false;
  return true;
}

export interface ChatResult {
  assistantMessage: string;
  preferences: Preferences;
  recommendations: RecommendationItem[] | null;
  isRecommendation: boolean;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function runChatTurn(
  userMessage: string,
  existingPrefs: Preferences,
  existingQuestionCount: number,
  chatHistory: ChatHistoryMessage[] = []
): Promise<ChatResult> {
  const updates = extractPreferencesFromMessage(userMessage, existingPrefs);
  let prefs: Preferences = mergePreferences(existingPrefs, {
    ...updates,
    questionCount: Math.min(existingQuestionCount + 1, 6),
  });

  // Infer genres from titles the user likes (e.g. "Frieren") so we don't have to ask "what genres?"
  if (prefs.examplesLiked.length > 0 && prefs.likedGenres.length < 10) {
    const type: MediaType = prefs.preferredFormat ?? "ANIME";
    const inferred = await inferGenresFromTitles(prefs.examplesLiked, type);
    if (inferred.length > 0) {
      const merged = new Set([...prefs.likedGenres, ...inferred]);
      prefs = { ...prefs, likedGenres: Array.from(merged) };
      log.debug("Inferred genres from titles", { titles: prefs.examplesLiked, inferredGenres: inferred });
    }
  }

  const askMore = shouldAskMore(prefs);

  if (askMore) {
    log.debug("Asking clarifying question", { questionCount: prefs.questionCount, hasFormat: !!prefs.preferredFormat, likedGenresCount: prefs.likedGenres.length });
    const assistantMessage = await generateReply({
      userMessage,
      preferences: prefs,
      chatHistory,
      recommendations: null,
    });
    return {
      assistantMessage,
      preferences: { ...prefs, questionCount: prefs.questionCount },
      recommendations: null,
      isRecommendation: false,
    };
  }

  const type: MediaType = prefs.preferredFormat ?? "ANIME";
  log.info("Fetching recommendations", { type, likedGenres: prefs.likedGenres.length, dislikedGenres: prefs.dislikedGenres.length });
  const recs = await getRecommendations(prefs, { type, limit: 8 });
  log.info("Recommendations ready", { count: recs.length });

  const assistantMessage = await generateReply({
    userMessage,
    preferences: prefs,
    chatHistory,
    recommendations: recs,
  });

  return {
    assistantMessage,
    preferences: { ...prefs, questionCount: prefs.questionCount },
    recommendations: recs,
    isRecommendation: true,
  };
}

export { EMPTY_PREFERENCES };
