import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";
const heartbeatSchema = z.object({ visible: z.boolean(), clientElapsedSeconds: z.number().int().min(0).max(60).optional() });
const HEARTBEAT_WINDOW_SECONDS = 45;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  const limit = rateLimit(`usage:${user.id}`, 60, 60_000);
  if (!limit.allowed) return rateLimited(limit.retryAfter);
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 }); }
  const parsed = heartbeatSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Heartbeat tidak valid." }, { status: 400 });
  const now = new Date();
  try {
    const existing = await db.activeUsageSession.findUnique({ where: { sessionId: user.sessionId } });
    if (!parsed.data.visible) {
      if (existing && !existing.endedAt) await db.activeUsageSession.update({ where: { sessionId: user.sessionId }, data: { endedAt: now } });
      return NextResponse.json({ ok: true, activeSeconds: existing?.activeSeconds ?? 0 });
    }
    const seconds = existing ? Math.min(parsed.data.clientElapsedSeconds ?? 15, HEARTBEAT_WINDOW_SECONDS, Math.max(0, Math.floor((now.getTime() - existing.lastHeartbeatAt.getTime()) / 1000))) : 0;
    const usage = await db.activeUsageSession.upsert({
      where: { sessionId: user.sessionId },
      create: { userId: user.id, sessionId: user.sessionId, startedAt: now, lastHeartbeatAt: now },
      update: { lastHeartbeatAt: now, endedAt: null, ...(seconds > 0 ? { activeSeconds: { increment: seconds } } : {}) },
    });
    if (seconds > 0) await db.usageEvent.create({ data: { userId: user.id, category: "active.seconds", quantity: seconds } });
    return NextResponse.json({ ok: true, activeSeconds: usage.activeSeconds + (seconds > 0 ? seconds : 0) });
  } catch { return NextResponse.json({ error: "Penggunaan aktif belum dapat disimpan." }, { status: 503 }); }
}
