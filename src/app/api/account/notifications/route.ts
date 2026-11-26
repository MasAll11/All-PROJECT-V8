import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";
const updateSchema = z.object({ action: z.enum(["read", "read_all"]), id: z.string().cuid().optional() });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  try {
    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, category: true, title: true, body: true, link: true, readAt: true, createdAt: true } }),
      db.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return NextResponse.json({ notifications, unreadCount }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Notifikasi belum dapat dimuat." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  const limit = rateLimit(`notifications:${user.id}`, 30, 60_000);
  if (!limit.allowed) return rateLimited(limit.retryAfter);
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || (parsed.data.action === "read" && !parsed.data.id)) return NextResponse.json({ error: "Aksi notifikasi tidak valid." }, { status: 400 });
  try {
    if (parsed.data.action === "read_all") await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    else await db.notification.updateMany({ where: { id: parsed.data.id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Status notifikasi belum dapat diperbarui." }, { status: 503 }); }
}
