import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";
const paramsSchema = z.object({ id: z.string().cuid() });
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ban"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("unban") }),
  z.object({ action: z.literal("role"), role: z.enum(["MEMBER", "MEMBER_UTAMA", "MODERATOR", "ADMIN", "VIP"]) }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  if (!actor.permissions.includes("members.manage") && !["SUPER_ADMIN", "DEVELOPER", "ADMIN"].includes(actor.role)) return NextResponse.json({ error: "Anda tidak memiliki izin mengelola member." }, { status: 403 });
  const limited = rateLimit(`developer:member:${actor.id}`, 30, 60_000);
  if (!limited.allowed) return rateLimited(limited.retryAfter);
  const { id } = await context.params;
  if (!paramsSchema.safeParse({ id }).success) return NextResponse.json({ error: "ID member tidak valid." }, { status: 400 });
  if (id === actor.id) return NextResponse.json({ error: "Anda tidak dapat mengubah status akun sendiri dari panel ini." }, { status: 400 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 }); }
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Aksi tidak valid." }, { status: 400 });
  try {
    const target = await db.user.findUnique({ where: { id }, include: { role: true } });
    if (!target) return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
    // Prevent lower-trust operators from modifying privileged accounts.
    const privileged = ["SUPER_ADMIN", "DEVELOPER", "ADMIN"];
    if (privileged.includes(target.role?.name ?? "") && !["SUPER_ADMIN", "DEVELOPER"].includes(actor.role)) return NextResponse.json({ error: "Akun dengan role privileged hanya dapat dikelola developer." }, { status: 403 });
    const input = parsed.data;
    if (input.action === "role") {
      const targetRole = await db.role.findUnique({ where: { name: input.role } });
      if (!targetRole) return NextResponse.json({ error: "Role belum di-seed. Jalankan seed role terlebih dahulu." }, { status: 409 });
      const next = await db.$transaction(async (tx) => {
        const changed = await tx.user.update({ where: { id }, data: { roleId: targetRole.id } });
        await tx.roleHistory.create({ data: { userId: id, actorId: actor.id, fromRole: target.role?.name ?? null, toRole: input.role, reason: "Manual developer role update" } });
        await tx.auditLog.create({ data: { actorId: actor.id, action: "member.role.changed", targetType: "user", targetId: id, metadata: { from: target.role?.name ?? null, to: input.role } } });
        await tx.notification.create({ data: { userId: id, category: "account", title: "Role akun diperbarui", body: `Role akun Anda sekarang ${input.role}.` } });
        return changed;
      });
      return NextResponse.json({ member: { id: next.id, role: input.role, status: next.status } });
    }
    const status = input.action === "ban" ? "BANNED" : input.action === "suspend" ? "SUSPENDED" : "ACTIVE";
    const changed = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data: { status } });
      if (status !== "ACTIVE") await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: `member.${input.action}`, targetType: "user", targetId: id, metadata: "reason" in input ? { reason: input.reason } : undefined } });
      await tx.notification.create({ data: { userId: id, category: "account", title: status === "ACTIVE" ? "Status akun diperbarui" : "Akses akun dibatasi", body: status === "ACTIVE" ? "Akun Anda telah diaktifkan kembali." : `Akses akun dibatasi. Alasan: ${"reason" in input ? input.reason : "Tidak dicantumkan"}` } });
      return updated;
    });
    return NextResponse.json({ member: { id: changed.id, status: changed.status } });
  } catch (error) {
    console.error("Member management failed", error);
    return NextResponse.json({ error: "Perubahan member gagal disimpan." }, { status: 503 });
  }
}
