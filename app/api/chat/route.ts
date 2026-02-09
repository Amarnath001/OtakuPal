import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { runChatTurn, EMPTY_PREFERENCES } from "@/lib/chat-logic";
import { preferencesFromDbRow, preferencesToDbRow } from "@/lib/preferences";
import { logger } from "@/lib/logger";

const log = logger.child("api:chat");

const ChatBodySchema = z.object({
  sessionId: z.string().nullable().optional(),
  message: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ChatBodySchema.safeParse(body);
    if (!parsed.success) {
      log.warn("Invalid request body", { errors: parsed.error.flatten() });
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const { sessionId: rawSessionId, message } = parsed.data;

    let sessionId = rawSessionId ?? undefined;
    if (!sessionId) {
      const user = await prisma.user.create({ data: {} });
      const session = await prisma.session.create({ data: { userId: user.id } });
      sessionId = session.id;
      log.info("New session created", { sessionId, userId: user.id });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "asc" } }, preference: true },
    });
    if (!session) {
      log.warn("Session not found", { sessionId });
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existingPrefs = session.preference
      ? preferencesFromDbRow(session.preference)
      : EMPTY_PREFERENCES;
    const questionCount = existingPrefs.questionCount ?? 0;

    log.debug("Running chat turn", { sessionId, messageLength: message.length, questionCount });

    const chatHistory = session.messages.slice(-10).map((m) => ({
  role: m.role as "user" | "assistant",
  content: m.content,
}));
const result = await runChatTurn(message, existingPrefs, questionCount, chatHistory);

    await prisma.message.createMany({
      data: [
        { sessionId, role: "user", content: message },
        { sessionId, role: "assistant", content: result.assistantMessage },
      ],
    });

    const prefsRow = preferencesToDbRow(result.preferences);
    await prisma.preference.upsert({
      where: { sessionId },
      create: { sessionId, ...prefsRow },
      update: prefsRow,
    });

    log.info("Chat turn completed", {
      sessionId,
      isRecommendation: result.isRecommendation,
      recommendationCount: result.recommendations?.length ?? 0,
    });

    return NextResponse.json({
      sessionId,
      assistantMessage: result.assistantMessage,
      preferences: result.preferences,
      recommendations: result.recommendations,
      isRecommendation: result.isRecommendation,
    });
  } catch (e) {
    log.error("Chat API error", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
