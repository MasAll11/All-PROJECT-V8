import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ user: {
      id: user.id, email: user.email, username: user.username,
      displayName: user.displayName, role: user.role, permissions: user.permissions,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Database akun belum tersedia." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sesi sudah berakhir." }, { status: 401 });
  const limit = rateLimit(`logout:${user.id}`, 10);
  if (!limit.allowed) return rateLimited(limit.retryAfter);
  await db.$transaction([
    db.session.updateMany({ where: { id: user.sessionId, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.auditLog.create({ data: { actorId: user.id, action: "auth.logout", targetType: "session", targetId: user.sessionId } }),
  ]);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("allproject_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
