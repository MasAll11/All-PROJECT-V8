import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  try {
    const sessions = await db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, deviceLabel: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true }, orderBy: { lastSeenAt: "desc" } });
    return NextResponse.json({ sessions }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Sesi belum dapat dimuat." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  const limit = rateLimit(`sessions:${user.id}`, 10, 60_000);
  if (!limit.allowed) return rateLimited(limit.retryAfter);
  let body: { sessionId?: string; all?: boolean } = {};
  try { body = await request.json(); } catch { /* empty body revokes the current session */ }
  try {
    const where = body.all ? { userId: user.id, revokedAt: null } : body.sessionId ? { id: body.sessionId, userId: user.id, revokedAt: null } : { id: user.sessionId, userId: user.id, revokedAt: null };
    const result = await db.session.updateMany({ where, data: { revokedAt: new Date() } });
    await db.auditLog.create({ data: { actorId: user.id, action: body.all ? "session.revoke_all" : "session.revoke", targetType: "session", metadata: { count: result.count } } });
    const response = NextResponse.json({ ok: true, revoked: result.count });
    if (!body.sessionId || body.sessionId === user.sessionId || body.all) response.cookies.set("allproject_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch { return NextResponse.json({ error: "Sesi belum dapat dicabut." }, { status: 503 }); }
}
