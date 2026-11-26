import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  try {
    const items = await db.conversation.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, title: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } } });
    return NextResponse.json({ conversations: items }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Riwayat percakapan belum dapat dimuat." }, { status: 503 });
  }
}
