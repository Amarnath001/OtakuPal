import { z } from "zod";

export const PreferencesSchema = z.object({
  likedGenres: z.array(z.string()).default([]),
  dislikedGenres: z.array(z.string()).default([]),
  likedTags: z.array(z.string()).default([]),
  dislikedTags: z.array(z.string()).default([]),
  preferredFormat: z.enum(["ANIME", "MANGA"]).optional(),
  era: z.string().optional(),
  pacing: z.enum(["slow", "medium", "fast"]).optional(),
  mood: z.enum(["dark", "light", "mixed"]).optional(),
  noGoFilters: z.array(z.string()).default([]),
  examplesLiked: z.array(z.string()).default([]),
  questionCount: z.number().int().min(0).default(0),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

const GENRE_ALIASES: Record<string, string> = {
  action: "Action",
  adventure: "Adventure",
  comedy: "Comedy",
  drama: "Drama",
  romance: "Romance",
  scifi: "Sci-Fi",
  "sci-fi": "Sci-Fi",
  fantasy: "Fantasy",
  horror: "Horror",
  mystery: "Mystery",
  thriller: "Thriller",
  sliceoflife: "Slice of Life",
  "slice of life": "Slice of Life",
  sports: "Sports",
  supernatural: "Supernatural",
  psychological: "Psychological",
  mecha: "Mecha",
  historical: "Historical",
  military: "Military",
  ecchi: "Ecchi",
};

const TAG_NO_GO = ["ecchi", "hentai", "gore", "torture"];

function normalizeGenre(s: string): string {
  const lower = s.toLowerCase().trim();
  return GENRE_ALIASES[lower] ?? s.trim();
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function findMatchingGenres(text: string): string[] {
  const words = extractWords(text);
  const found = new Set<string>();
  for (const key of Object.keys(GENRE_ALIASES)) {
    // Only match when the user said the genre (word contains key or equals key), not when key contains a short substring like "en"
    if (words.some((w) => w.length >= 3 && (w === key || w.includes(key)))) found.add(GENRE_ALIASES[key]);
  }
  return Array.from(found);
}

function detectNegation(words: string[], i: number): boolean {
  const prev = words[i - 1];
  return prev === "no" || prev === "not" || prev === "don't" || prev === "dont" || prev === "without" || prev === "avoid";
}

const AVOID_CONTEXT = /\b(avoid|don't|dont|not|skip|without|no\s|rather\s+avoid|stay\s+away)\b/i;

/** Genres often given as "avoid" in short replies (e.g. "horror" to "what to avoid?") */
const COMMON_AVOID_GENRES = new Set(["horror", "ecchi", "gore", "torture", "romance"]);

export function extractPreferencesFromMessage(
  message: string,
  existing: Partial<Preferences> = {}
): Partial<Preferences> {
  const updates: Partial<Preferences> = {};
  const lower = message.toLowerCase();

  const words = extractWords(message);
  const noGo: string[] = [...(existing.noGoFilters ?? [])];
  for (const tag of TAG_NO_GO) {
    if (lower.includes(tag)) {
      const idx = words.findIndex((w) => w.includes(tag));
      if (idx === -1 || detectNegation(words, idx)) continue;
      if (!noGo.includes(tag)) noGo.push(tag);
    }
  }
  if (noGo.length) updates.noGoFilters = noGo;

  const isAvoidContext = AVOID_CONTEXT.test(message) || (message.split(/\s+/).length <= 3 && noGo.length > 0);
  const matchedGenres = findMatchingGenres(message);
  const isShortReplyOnlyAvoidGenres =
    message.trim().split(/\s+/).length <= 2 &&
    matchedGenres.length > 0 &&
    matchedGenres.every((g) => COMMON_AVOID_GENRES.has(g.toLowerCase()));

  if (matchedGenres.length) {
    if (isAvoidContext || isShortReplyOnlyAvoidGenres) {
      updates.dislikedGenres = Array.from(new Set([...(existing.dislikedGenres ?? []), ...matchedGenres]));
    } else {
      const existingNoGo = new Set((existing.noGoFilters ?? []).map((x) => x.toLowerCase()));
      const toAdd = matchedGenres.filter((g) => !existingNoGo.has(g.toLowerCase()));
      if (toAdd.length)
        updates.likedGenres = Array.from(new Set([...(existing.likedGenres ?? []), ...toAdd]));
    }
  }

  if (/\b(anime|tv|show)\b/.test(lower) && !/\bmanga\b/.test(lower)) updates.preferredFormat = "ANIME";
  if (/\bmanga\b/.test(lower) && !/\banime\b/.test(lower)) updates.preferredFormat = "MANGA";

  if (/\b(dark|grim|violent|gritty)\b/.test(lower)) updates.mood = "dark";
  if (/\b(light|fun|comedy|happy)\b/.test(lower)) updates.mood = "light";
  if (/\b(mixed|both)\b/.test(lower)) updates.mood = "mixed";

  if (/\b(slow|slice of life|calm)\b/.test(lower)) updates.pacing = "slow";
  if (/\b(fast|action|intense)\b/.test(lower)) updates.pacing = "fast";

  if (/\b(2000s|old|classic|90s|80s)\b/.test(lower)) updates.era = "2000s";
  if (/\b(recent|new|latest|2020)\b/.test(lower)) updates.era = "recent";

  const titlePattern = /\b(Vinland Saga|Berserk|Attack on Titan|Death Note|Fullmetal|FMA|Steins? Gate|Cowboy Bebop|Demon Slayer|Jujutsu Kaisen|One Piece|Naruto|Bleach|Spy x Family|Chainsaw Man|Mob Psycho|Re:Zero|Mushoku Tensei|Frieren|Frieren Beyond Journey'?s? End|Violet Evergarden)\b/gi;
  const titles = message.match(titlePattern);
  if (titles?.length) {
    const normalized = titles.map((t) => t.trim());
    updates.examplesLiked = Array.from(new Set([...(existing.examplesLiked ?? []), ...normalized]));
  }

  return updates;
}

export function mergePreferences(
  existing: Preferences,
  updates: Partial<Preferences>
): Preferences {
  return {
    likedGenres: updates.likedGenres ?? existing.likedGenres,
    dislikedGenres: updates.dislikedGenres ?? existing.dislikedGenres,
    likedTags: updates.likedTags ?? existing.likedTags,
    dislikedTags: updates.dislikedTags ?? existing.dislikedTags,
    preferredFormat: updates.preferredFormat ?? existing.preferredFormat,
    era: updates.era ?? existing.era,
    pacing: updates.pacing ?? existing.pacing,
    mood: updates.mood ?? existing.mood,
    noGoFilters: updates.noGoFilters ?? existing.noGoFilters,
    examplesLiked: updates.examplesLiked ?? existing.examplesLiked,
    questionCount: updates.questionCount ?? existing.questionCount,
  };
}

export const EMPTY_PREFERENCES: Preferences = {
  likedGenres: [],
  dislikedGenres: [],
  likedTags: [],
  dislikedTags: [],
  preferredFormat: undefined,
  era: undefined,
  pacing: undefined,
  mood: undefined,
  noGoFilters: [],
  examplesLiked: [],
  questionCount: 0,
};

export function preferencesFromDbRow(row: {
  likedGenres: string;
  dislikedGenres: string;
  likedTags: string;
  dislikedTags: string;
  preferredFormat: string | null;
  era: string | null;
  pacing: string | null;
  mood: string | null;
  noGoFilters: string;
  examplesLiked: string;
  questionCount: number;
}): Preferences {
  return {
    likedGenres: JSON.parse(row.likedGenres || "[]"),
    dislikedGenres: JSON.parse(row.dislikedGenres || "[]"),
    likedTags: JSON.parse(row.likedTags || "[]"),
    dislikedTags: JSON.parse(row.dislikedTags || "[]"),
    preferredFormat: (row.preferredFormat as "ANIME" | "MANGA") ?? undefined,
    era: row.era ?? undefined,
    pacing: (row.pacing as "slow" | "medium" | "fast") ?? undefined,
    mood: (row.mood as "dark" | "light" | "mixed") ?? undefined,
    noGoFilters: JSON.parse(row.noGoFilters || "[]"),
    examplesLiked: JSON.parse(row.examplesLiked || "[]"),
    questionCount: row.questionCount ?? 0,
  };
}

export function preferencesToDbRow(prefs: Preferences): {
  likedGenres: string;
  dislikedGenres: string;
  likedTags: string;
  dislikedTags: string;
  preferredFormat: string | null;
  era: string | null;
  pacing: string | null;
  mood: string | null;
  noGoFilters: string;
  examplesLiked: string;
  questionCount: number;
} {
  return {
    likedGenres: JSON.stringify(prefs.likedGenres),
    dislikedGenres: JSON.stringify(prefs.dislikedGenres),
    likedTags: JSON.stringify(prefs.likedTags),
    dislikedTags: JSON.stringify(prefs.dislikedTags),
    preferredFormat: prefs.preferredFormat ?? null,
    era: prefs.era ?? null,
    pacing: prefs.pacing ?? null,
    mood: prefs.mood ?? null,
    noGoFilters: JSON.stringify(prefs.noGoFilters),
    examplesLiked: JSON.stringify(prefs.examplesLiked),
    questionCount: prefs.questionCount,
  };
}
