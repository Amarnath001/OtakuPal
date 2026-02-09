# OtakuPal

Anime, manga, and manhwa recommendation chatbot with voice input. Get personalized picks from the AniList API based on your taste profile.

**Phase 3:** Text chat, taste profile, AniList recommendations, and voice via the browser’s Web Speech API — auto-send on pause, no backend STT or gateway.

## Tech stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **LLM:** Google Gemini (default: `gemini-2.5-flash-lite`)
- **Data:** AniList GraphQL API
- **Storage:** SQLite via Prisma (sessions, messages, preferences)
- **Voice:** Web Speech API (browser-native; no backend or API keys)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Create a `.env` in the project root (copy from `.env.example`):

   ```env
   DATABASE_URL="file:./dev.db"
   GEMINI_API_KEY="your-gemini-key"
   ```

   Optional: `GEMINI_MODEL` (default: `gemini-2.5-flash-lite`).

3. **Database**

   ```bash
   npx prisma migrate dev
   ```

   This creates `prisma/dev.db` and applies migrations.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `app/` — Page, layout, and UI (chat, Taste Profile card, input, voice)
- `app/api/chat/route.ts` — Chat endpoint (session, preferences, recommendations)
- `app/api/session/route.ts` — Load session history and preferences
- `lib/anilist.ts` — AniList GraphQL client and media search
- `lib/llm.ts` — Gemini integration
- `lib/preferences.ts` — Preference schema (Zod), extraction, DB helpers
- `lib/recommender.ts` — AniList query, ranking, “why this fits” text
- `lib/chat-logic.ts` — Clarifying questions and when to recommend
- `lib/logger.ts` — Logger (optional `LOG_LEVEL` env)
- `prisma/` — Schema and migrations

## Chat flow

1. Start the app and open the home page.
2. Use **“Try example prompt”** or type something like:  
   `I liked Vinland Saga and Berserk, want something dark but not too depressing.`
3. The bot asks clarifying questions (format, genres, avoid list, mood, favorites).
4. After enough info, it returns **5–10 recommendations** from AniList with title, cover, format, episodes/chapters, and “why this fits you.”
5. The **Taste Profile** card (right on desktop, below on mobile) updates as preferences are extracted.
6. Session is stored in `localStorage`; reload to see history and continue.

## Voice

Click **Start Voice** to use the browser’s Web Speech API. Speak; the transcript updates in real time. After you pause (~2.5 s), the transcript is **auto-sent** to the chat. You can also click **Send transcript to chat** anytime. After each send, recognition restarts so the next utterance is clean (no carryover). **Stop Voice** when done. Works in Chrome, Edge, and Safari; no backend or credentials needed for voice.

## Env vars

| Variable         | Required | Description                                      |
|------------------|----------|--------------------------------------------------|
| `DATABASE_URL`   | Yes      | SQLite path, e.g. `file:./dev.db`                |
| `GEMINI_API_KEY` | Yes      | For AI chat (Gemini)                             |
| `GEMINI_MODEL`   | No       | Default: `gemini-2.5-flash-lite`                 |
| `LOG_LEVEL`      | No       | `debug`, `info`, `warn`, `error` (default: debug in dev) |

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Run production server
- `npx prisma migrate dev` — Apply migrations (dev)
- `npx prisma studio` — Open Prisma Studio
