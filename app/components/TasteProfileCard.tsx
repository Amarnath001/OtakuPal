"use client";

import type { Preferences } from "@/lib/preferences";

interface TasteProfileCardProps {
  preferences: Preferences | null;
}

export function TasteProfileCard({ preferences }: TasteProfileCardProps) {
  if (!preferences) {
    return (
      <div className="rounded-xl border border-otaku-border bg-otaku-card p-4 text-sm text-otaku-muted">
        <h3 className="mb-2 font-semibold text-zinc-200">Taste Profile</h3>
        <p>Answer a few questions in the chat and your preferences will appear here.</p>
      </div>
    );
  }

  const hasAny =
    preferences.likedGenres.length > 0 ||
    preferences.dislikedGenres.length > 0 ||
    preferences.likedTags.length > 0 ||
    preferences.dislikedTags.length > 0 ||
    preferences.preferredFormat ||
    preferences.mood ||
    preferences.examplesLiked.length > 0 ||
    preferences.noGoFilters.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-otaku-border bg-otaku-card p-4 text-sm text-otaku-muted">
        <h3 className="mb-2 font-semibold text-zinc-200">Taste Profile</h3>
        <p>Share what you like in chat to build your profile.</p>
      </div>
    );
  }

  const noGoSet = new Set(preferences.noGoFilters.map((x) => x.toLowerCase()));
  const likedGenresDisplay = preferences.likedGenres.filter((g) => !noGoSet.has(g.toLowerCase()));

  return (
    <div className="rounded-xl border border-otaku-border bg-otaku-card p-4 text-sm">
      <h3 className="mb-3 font-semibold text-zinc-200">Taste Profile</h3>
      <dl className="space-y-2">
        {preferences.preferredFormat && (
          <div>
            <dt className="text-otaku-muted">Format</dt>
            <dd className="text-zinc-200">{preferences.preferredFormat}</dd>
          </div>
        )}
        {likedGenresDisplay.length > 0 && (
          <div>
            <dt className="text-otaku-muted">Liked genres</dt>
            <dd className="text-zinc-200">{likedGenresDisplay.join(", ")}</dd>
          </div>
        )}
        {preferences.dislikedGenres.length > 0 && (
          <div>
            <dt className="text-otaku-muted">Avoid genres</dt>
            <dd className="text-zinc-200">{preferences.dislikedGenres.join(", ")}</dd>
          </div>
        )}
        {preferences.mood && (
          <div>
            <dt className="text-otaku-muted">Mood</dt>
            <dd className="text-zinc-200">{preferences.mood}</dd>
          </div>
        )}
        {preferences.examplesLiked.length > 0 && (
          <div>
            <dt className="text-otaku-muted">Examples you liked</dt>
            <dd className="text-zinc-200">{preferences.examplesLiked.join(", ")}</dd>
          </div>
        )}
        {preferences.noGoFilters.length > 0 && (
          <div>
            <dt className="text-otaku-muted">No-go</dt>
            <dd className="text-zinc-200">{preferences.noGoFilters.join(", ")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
