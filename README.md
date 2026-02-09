# OtakuPal

Anime, manga, and manhwa recommendation chatbot with voice input. Get personalized picks from the AniList API based on your taste profile.

**Phase 2:** Text chat, taste profile, AniList recommendations, and voice input via the browser’s Web Speech API (no backend STT, no gateway).

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Data:** AniList GraphQL API
- **Storage:** SQLite via Prisma (users, sessions, messages, preferences)
- **Voice:** Web Speech API (browser-native, no backend required)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Create a `.env` in the project root (or copy from `.env.example`):

   ```env
   DATABASE_URL="file:./dev.db"
   GEMINI_API_KEY="your-gemini-key"
   ```

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

   **Voice:** Click **Start Voice** and speak. The browser’s Web Speech API transcribes in real time. Use **Send transcript to chat** to post the transcript. Works in Chrome, Edge, and Safari. No gateway or credentials required.

## Project structure

- `app/` — Page, layout, and UI components (chat, Taste Profile card, input, voice)
- `app/api/chat/route.ts` — Main chat endpoint (session, preferences, recommendations)
- `app/api/session/route.ts` — Load session history and preferences
- `lib/anilist.ts` — AniList GraphQL client and media search
- `lib/preferences.ts` — Preference schema (Zod), extraction from messages, DB helpers
- `lib/recommender.ts` — AniList query + heuristic ranking + “why this fits” text
- `lib/chat-logic.ts` — Clarifying questions and when to return recommendations
- `lib/logger.ts` — Central logger (levels, namespaces, optional `LOG_LEVEL` env)
- `prisma/` — Schema and migrations

## How to test the chat flow

1. Start the app and open the home page.
2. Use **“Try example prompt”** or type something like:  
   `I liked Vinland Saga and Berserk, want something dark but not too depressing.`
3. The bot will ask a few clarifying questions (format, genres, avoid list, mood, favorites).
4. After 3–6 exchanges (or once you’ve given enough info), it returns **5–10 recommendations** from AniList with title, cover, format, episodes/chapters, and a short “why this fits you.”
5. The **Taste Profile** card on the right (or below on mobile) updates as preferences are extracted from your messages.
6. Session is stored in `localStorage`; reload the page to see history and continue the conversation.

## Voice

Click **Start Voice** in the chat area. The browser uses the Web Speech API to transcribe your speech in real time. Use **Send transcript to chat** to post the current transcript into the chat. **Stop Voice** stops listening. Works in Chrome, Edge, and Safari. No backend or API keys required for voice.

## Env vars (reference)

| Variable       | Required | Description                                                                 |
|----------------|----------|-----------------------------------------------------------------------------|
| `DATABASE_URL` | Yes      | SQLite path, e.g. `file:./dev.db`                                           |
| `GEMINI_API_KEY` | Yes    | For AI chat (Gemini)                                                        |
| `GEMINI_MODEL` | No       | Optional; default `gemini-2.0-flash`                                        |
| `LOG_LEVEL`    | No       | Min level: `debug`, `info`, `warn`, `error`. Default: `debug` (dev), `info` (prod). |

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Run production server
- `npx prisma migrate dev` — Apply migrations (dev)
- `npx prisma studio` — Open Prisma Studio on the DB
