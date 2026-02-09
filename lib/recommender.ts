import type { AniListMedia, MediaType } from "./anilist";
import { searchMedia, getDisplayTitle } from "./anilist";
import type { Preferences } from "./preferences";
import { logger } from "./logger";

const log = logger.child("recommender");

export interface RecommendationItem {
  id: number;
  title: string;
  coverImage: string | null;
  format: string | null;
  episodes: number | null;
  chapters: number | null;
  genres: string[];
  tags: string[];
  whyFits: string;
  raw: AniListMedia;
}

function tagNames(media: AniListMedia): string[] {
  return (media.tags ?? []).map((t) => t.name);
}

function scoreMatch(media: AniListMedia, prefs: Preferences): number {
  let score = 0;
  const genres = media.genres ?? [];
  const tags = tagNames(media);

  for (const g of prefs.likedGenres) {
    if (genres.some((x) => x.toLowerCase() === g.toLowerCase())) score += 3;
  }
  for (const t of prefs.likedTags) {
    if (tags.some((x) => x.toLowerCase().includes(t.toLowerCase()))) score += 2;
  }
  for (const g of prefs.dislikedGenres) {
    if (genres.some((x) => x.toLowerCase() === g.toLowerCase())) score -= 4;
  }
  for (const t of prefs.dislikedTags) {
    if (tags.some((x) => x.toLowerCase().includes(t.toLowerCase()))) score -= 3;
  }
  for (const no of prefs.noGoFilters) {
    if (tags.some((x) => x.toLowerCase().includes(no)) || genres.some((x) => x.toLowerCase() === no.toLowerCase()))
      score -= 20;
  }

  if (media.averageScore != null) score += Math.floor(media.averageScore / 25);
  if (media.popularity != null) score += Math.min(10, Math.floor(Math.log10(media.popularity + 1)));

  return score;
}

function buildWhyFits(media: AniListMedia, prefs: Preferences): string {
  const parts: string[] = [];
  const genres = media.genres ?? [];
  const tags = tagNames(media);

  const likedGenres = prefs.likedGenres.filter((g) =>
    genres.some((x) => x.toLowerCase() === g.toLowerCase())
  );
  if (likedGenres.length) parts.push(`Matches your interest in ${likedGenres.slice(0, 2).join(" and ")}.`);
  if (media.averageScore != null && media.averageScore >= 80)
    parts.push("Highly rated by the community.");
  if (prefs.mood === "dark" && (genres.includes("Drama") || genres.includes("Action") || tags.some((t) => /dark|tragedy|violent/i.test(t))))
    parts.push("Fits a darker, more serious tone.");
  if (prefs.mood === "light" && (genres.includes("Comedy") || genres.includes("Slice of Life")))
    parts.push("Lighter tone that fits your mood.");
  if (parts.length === 0) parts.push("Popular and well-received; worth a try based on your format preference.");
  return parts.join(" ");
}

export async function getRecommendations(
  prefs: Preferences,
  options: { type?: MediaType; limit?: number } = {}
): Promise<RecommendationItem[]> {
  const type = (options.type ?? prefs.preferredFormat) ?? "ANIME";
  const limit = options.limit ?? 10;

  const genreNotIn = [...prefs.dislikedGenres];
  if (prefs.noGoFilters.some((x) => x.toLowerCase() === "ecchi")) genreNotIn.push("Ecchi");
  const genreNotInSet = new Set(genreNotIn.map((g) => g.toLowerCase()));

  // Don't request genre_in that we're also filtering out (avoids empty results).
  // Cap at 5 so AniList returns results (too many genres can yield 0 when interpreted strictly).
  const allLiked = prefs.likedGenres.filter((g) => !genreNotInSet.has(g.toLowerCase()));
  const genreIn = allLiked.length ? allLiked.slice(0, 5) : undefined;

  // Only use tag_not_in for explicit dislikedTags; noGoFilters like "ecchi" are handled via genre_not_in
  const tagNotIn = prefs.dislikedTags.length ? [...prefs.dislikedTags] : undefined;
  const isAdult = prefs.noGoFilters.some((x) => x.toLowerCase() === "ecchi" || x.toLowerCase() === "hentai")
    ? false
    : undefined;

  let startDateGreater: number | undefined;
  let startDateLesser: number | undefined;
  if (prefs.era === "recent") startDateGreater = 20180101;
  if (prefs.era === "2000s") startDateLesser = 20120101;

  const perPage = 50;
  const { Page } = await searchMedia({
    type,
    genre_in: genreIn?.length ? genreIn : undefined,
    genre_not_in: genreNotIn.length ? genreNotIn : undefined,
    tag_not_in: tagNotIn?.length ? tagNotIn : undefined,
    isAdult,
    sort: ["POPULARITY_DESC"],
    page: 1,
    perPage,
    startDate_greater: startDateGreater,
    startDate_lesser: startDateLesser,
  });

  const media = Page.media ?? [];
  const scored = media
    .map((m) => ({ media: m, score: scoreMatch(m, prefs) }))
    .filter(({ score }) => score > -15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  log.debug("Ranked and filtered recommendations", { type, candidateCount: media.length, returnedCount: scored.length });

  return scored.map(({ media: m }) => ({
    id: m.id,
    title: getDisplayTitle(m),
    coverImage: m.coverImage?.large ?? m.coverImage?.medium ?? null,
    format: m.format ?? null,
    episodes: m.episodes ?? null,
    chapters: m.chapters ?? null,
    genres: m.genres ?? [],
    tags: tagNames(m),
    whyFits: buildWhyFits(m, prefs),
    raw: m,
  }));
}
