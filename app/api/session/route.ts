import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { preferencesFromDbRow } from "@/lib/preferences";
import { logger } from "@/lib/logger";

const log = logger.child("api:session");

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    log.warn("Session GET called without sessionId");
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } }, preference: true },
  });
  if (!session) {
    log.warn("Session not found", { sessionId });
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  log.info("Session loaded", { sessionId, messageCount: session.messages.length });

  const preferences = session.preference
    ? preferencesFromDbRow(session.preference)
    : null;
  return NextResponse.json({
    sessionId: session.id,
    messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
    preferences,
  });
}
