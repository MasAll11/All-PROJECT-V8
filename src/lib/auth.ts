import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "allproject_session";
const SESSION_DAYS = 30;

export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") return null;

  return {
    id: session.user.id,
    email: session.user.email,
    username: session.user.username,
    displayName: session.user.displayName,
    status: session.user.status,
    role: session.user.role?.name ?? "MEMBER",
    permissions: session.user.role?.permissions.map((item) => item.permission.key) ?? [],
    sessionId: session.id,
  };
}

export async function requestMetadata() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const secret = process.env.SESSION_SECRET;
  // Store only a one-way digest; avoid retaining raw IP addresses.
  const ipHash = ip && secret ? digest(`${secret}:${ip}`) : null;
  return { userAgent, ipHash };
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}
