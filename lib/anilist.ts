import { logger } from "@/lib/logger";

const log = logger.child("anilist");
const ANILIST_GRAPHQL = "https://graphql.anilist.co";

export type MediaType = "ANIME" | "MANGA";

export interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    large: string | null;
    medium: string | null;
  } | null;
  type: MediaType;
  format: string | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  genres: string[];
  tags: { name: string; rank: number }[];
  averageScore: number | null;
  popularity: number | null;
  description: string | null;
  isAdult: boolean | null;
}

export interface PageMediaResult {
  Page: {
    pageInfo: { total: number; hasNextPage: boolean };
    media: AniListMedia[];
  };
}

export interface MediaSearchVariables {
  type?: MediaType;
  search?: string;
  genre_in?: string[];
  genre_not_in?: string[];
  tag_in?: string[];
  tag_not_in?: string[];
  format_in?: string[];
  isAdult?: boolean;
  sort?: string[];
  page?: number;
  perPage?: number;
  startDate_greater?: number;
  startDate_lesser?: number;
}

const MEDIA_FRAGMENT = `
  id
  title { romaji english native }
  coverImage { large medium }
  type
  format
  episodes
  chapters
  volumes
  genres
  tags { name rank }
  averageScore
  popularity
  description
  isAdult
`;

export async function anilistQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(ANILIST_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok) {
    const msg = json.errors?.length ? json.errors.map((e) => e.message).join("; ") : (json as { message?: string }).message ?? res.statusText;
    log.error("AniList API error", { status: res.status, message: msg });
    throw new Error(`AniList API error: ${res.status} - ${msg}`);
  }
  if (json.errors?.length) {
    const errMsg = json.errors.map((e) => e.message).join("; ");
    log.error("AniList GraphQL errors", { errors: json.errors });
    throw new Error(errMsg);
  }
  if (!json.data) {
    log.error("AniList API returned no data");
    throw new Error("AniList API returned no data");
  }
  return json.data;
}

export function buildMediaSearchQuery(): string {
  return `
    query MediaSearch(
      $type: MediaType
      $search: String
      $genre_in: [String]
      $genre_not_in: [String]
      $tag_in: [String]
      $tag_not_in: [String]
      $format_in: [MediaFormat]
      $isAdult: Boolean
      $sort: [MediaSort]
      $page: Int
      $perPage: Int
      $startDate_greater: FuzzyDateInt
      $startDate_lesser: FuzzyDateInt
    ) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total hasNextPage }
        media(
          type: $type
          search: $search
          genre_in: $genre_in
          genre_not_in: $genre_not_in
          tag_in: $tag_in
          tag_not_in: $tag_not_in
          format_in: $format_in
          isAdult: $isAdult
          sort: $sort
          startDate_greater: $startDate_greater
          startDate_lesser: $startDate_lesser
        ) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;
}

export async function searchMedia(
  variables: MediaSearchVariables
): Promise<PageMediaResult> {
  const safeVars: Record<string, unknown> = {
    page: variables.page ?? 1,
    perPage: Math.min(variables.perPage ?? 20, 50),
    sort: variables.sort ?? ["POPULARITY_DESC"],
  };
  if (variables.type) safeVars.type = variables.type;
  if (variables.search) safeVars.search = variables.search;
  if (variables.genre_in?.length) safeVars.genre_in = variables.genre_in;
  if (variables.genre_not_in?.length) safeVars.genre_not_in = variables.genre_not_in;
  if (variables.tag_in?.length) safeVars.tag_in = variables.tag_in;
  if (variables.tag_not_in?.length) safeVars.tag_not_in = variables.tag_not_in;
  if (variables.format_in?.length) safeVars.format_in = variables.format_in;
  if (variables.isAdult !== undefined) safeVars.isAdult = variables.isAdult;
  if (variables.startDate_greater != null) safeVars.startDate_greater = variables.startDate_greater;
  if (variables.startDate_lesser != null) safeVars.startDate_lesser = variables.startDate_lesser;

  log.debug("Searching media", { type: variables.type, search: variables.search, page: safeVars.page, perPage: safeVars.perPage });
  const result = await anilistQuery<PageMediaResult>(buildMediaSearchQuery(), safeVars);
  const count = result?.Page?.media?.length ?? 0;
  log.debug("Search completed", { resultCount: count });
  return result;
}

export function getDisplayTitle(m: AniListMedia): string {
  return m.title.english ?? m.title.romaji ?? m.title.native ?? "Unknown";
}

/** Fetch genres (and tags) for the first AniList result matching a title. Used to infer taste from "I like X". */
export async function getGenresForTitle(
  title: string,
  type: MediaType = "ANIME"
): Promise<{ genres: string[]; tags: string[] }> {
  log.debug("Fetching genres for title", { title: title.trim(), type });
  const { Page } = await searchMedia({
    search: title.trim(),
    type,
    perPage: 1,
    page: 1,
  });
  const media = Page?.media?.[0];
  if (!media) {
    log.debug("No AniList result for title", { title: title.trim() });
    return { genres: [], tags: [] };
  }
  const tags = (media.tags ?? []).map((t) => t.name);
  log.debug("Genres inferred from title", { title: title.trim(), genres: media.genres?.length ?? 0 });
  return { genres: media.genres ?? [], tags };
}
