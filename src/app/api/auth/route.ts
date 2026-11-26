import { NextResponse } from "next/server";
import { z } from "zod";
import { hash, compare } from "bcryptjs";
import { db } from "@/lib/db";
import { cookieOptions, createSessionToken, digest, requestMetadata, SESSION_COOKIE, sessionExpiry } from "@/lib/auth";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";
import { loginSchema, registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

function clientKey(request: Request, email: string) {
  return `${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}:${email}`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Format request tidak valid." }, { status: 400 }); }
  const action = request.headers.get("x-auth-action") === "register" ? "register" : "login";
  const parsed = (action === "register" ? registerSchema : loginSchema).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa kembali data yang dimasukkan." }, { status: 400 });
  const email = parsed.data.email;
  const limit = rateLimit(clientKey(request, email), action === "login" ? 8 : 4);
  if (!limit.allowed) return rateLimited(limit.retryAfter);

  const metadata = await requestMetadata();
  if (action === "register") {
    const input = registerSchema.parse(body);
    try {
      const passwordHash = await hash(input.password, 12);
      const memberRole = await db.role.upsert({
        where: { name: "MEMBER" },
        update: {},
        create: { name: "MEMBER", description: "Standard member account" },
      });
      const user = await db.user.create({ data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        status: "ACTIVE",
        roleId: memberRole.id,
      } });
      const token = createSessionToken();
      const session = await db.session.create({ data: {
        userId: user.id,
        tokenHash: digest(token),
        deviceLabel: metadata.userAgent?.slice(0, 120) ?? "Browser",
        userAgent: metadata.userAgent,
        expiresAt: sessionExpiry(),
      } });
      await db.$transaction([
        db.loginEvent.create({ data: { userId: user.id, success: true, ipHash: metadata.ipHash, userAgent: metadata.userAgent } }),
        db.auditLog.create({ data: { actorId: user.id, action: "account.register", targetType: "user", targetId: user.id } }),
      ]);
      const response = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: "MEMBER" } }, { status: 201 });
      response.cookies.set(SESSION_COOKIE, token, cookieOptions());
      return response;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "P2002") return NextResponse.json({ error: "Email atau username sudah digunakan." }, { status: 409 });
      console.error("Registration failed", error);
      return NextResponse.json({ error: "Akun belum dapat dibuat. Pastikan database sudah dikonfigurasi." }, { status: 503 });
    }
  }

  const input = loginSchema.parse(body);
  try {
    const user = await db.user.findUnique({ where: { email: input.email }, include: { role: true } });
    const valid = user ? await compare(input.password, user.passwordHash) : false;
    if (!user || !valid || user.status !== "ACTIVE") {
      await db.loginEvent.create({ data: { userId: user?.id, success: false, ipHash: metadata.ipHash, userAgent: metadata.userAgent } }).catch(() => undefined);
      const message = user?.status === "BANNED" || user?.status === "SUSPENDED" ? "Akun sedang dibatasi. Hubungi administrator." : "Email atau kata sandi tidak cocok.";
      return NextResponse.json({ error: message }, { status: 401 });
    }
    const token = createSessionToken();
    await db.$transaction([
      db.session.create({ data: { userId: user.id, tokenHash: digest(token), deviceLabel: metadata.userAgent?.slice(0, 120) ?? "Browser", userAgent: metadata.userAgent, expiresAt: sessionExpiry() } }),
      db.loginEvent.create({ data: { userId: user.id, success: true, ipHash: metadata.ipHash, userAgent: metadata.userAgent } }),
      db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      db.auditLog.create({ data: { actorId: user.id, action: "auth.login", targetType: "user", targetId: user.id } }),
    ]);
    const response = NextResponse.json({ user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName, role: user.role?.name ?? "MEMBER" } });
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Layanan akun belum siap. Periksa konfigurasi database." }, { status: 503 });
  }
}
