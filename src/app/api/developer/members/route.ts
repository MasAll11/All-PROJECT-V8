import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimited } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";
const querySchema = z.object({ q: z.string().trim().max(80).optional(), status: z.enum(["ACTIVE", "PENDING", "SUSPENDED", "BANNED"]).optional(), cursor: z.string().cuid().optional() });
const developers = ["SUPER_ADMIN", "DEVELOPER", "ADMIN"];

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  if (!actor.permissions.includes("members.view") && !developers.includes(actor.role)) return NextResponse.json({ error: "Anda tidak memiliki izin melihat daftar member." }, { status: 403 });
  const limit = rateLimit(`developer:list:${actor.id}`, 60, 60_000);
  if (!limit.allowed) return rateLimited(limit.retryAfter);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? undefined, status: url.searchParams.get("status") ?? undefined, cursor: url.searchParams.get("cursor") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Filter member tidak valid." }, { status: 400 });
  const { q, status, cursor } = parsed.data;
  try {
    const members = await db.user.findMany({
      where: { ...(status ? { status } : {}), ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }] } : {}) },
      select: { id: true, email: true, username: true, displayName: true, status: true, createdAt: true, lastLoginAt: true, role: { select: { name: true } }, _count: { select: { sessions: true, usageEvents: true } } },
      orderBy: { createdAt: "desc" }, take: 30, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return NextResponse.json({ members, nextCursor: members.length === 30 ? members.at(-1)?.id : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Member list failed", error);
    return NextResponse.json({ error: "Daftar member belum dapat dimuat." }, { status: 503 });
  }
}
