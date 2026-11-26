import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, rateLimited, sameOrigin } from "@/lib/security";
import { chatSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

type Provider = "openai" | "google" | "anthropic" | "xai" | "deepseek" | "github";
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type ProviderConfig = { env: string; model: string; url: string };
const providerConfig: Record<Provider, ProviderConfig> = {
  openai: { env: "OPENAI_API_KEY", model: process.env.OPENAI_MODEL || "gpt-4o-mini", url: "https://api.openai.com/v1/chat/completions" },
  google: { env: "GOOGLE_AI_API_KEY", model: process.env.GOOGLE_AI_MODEL || "gemini-2.0-flash", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" },
  anthropic: { env: "ANTHROPIC_API_KEY", model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest", url: "https://api.anthropic.com/v1/messages" },
  xai: { env: "XAI_API_KEY", model: process.env.XAI_MODEL || "grok-3-mini-fast", url: "https://api.x.ai/v1/chat/completions" },
  deepseek: { env: "DEEPSEEK_API_KEY", model: process.env.DEEPSEEK_MODEL || "deepseek-chat", url: "https://api.deepseek.com/chat/completions" },
  github: { env: "GITHUB_TOKEN", model: process.env.GITHUB_MODEL || "openai/gpt-4o-mini", url: "https://models.github.ai/inference/chat/completions" },
};
const providerOrder: Provider[] = ["openai", "google", "anthropic", "xai", "deepseek", "github"];

export async function GET() {
  return NextResponse.json({ providers: Object.entries(providerConfig).map(([id, config]) => ({ id, configured: Boolean(process.env[config.env]), model: config.model })) }, { headers: { "Cache-Control": "no-store" } });
}

async function callProvider(provider: Provider, messages: ChatMessage[]) {
  const config = providerConfig[provider];
  const apiKey = process.env[config.env];
  if (!apiKey) throw new Error(`${provider} belum dikonfigurasi.`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    let response: Response;
    let text: string | undefined;
    if (provider === "anthropic") {
      const system = messages.find((message) => message.role === "system")?.content;
      const anthropicMessages = messages.filter((message) => message.role !== "system");
      response = await fetch(config.url, {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: config.model, max_tokens: 2048, system, messages: anthropicMessages }),
      });
      const data = await response.json();
      text = data.content?.filter((part: { type: string }) => part.type === "text").map((part: { text: string }) => part.text).join("\n");
    } else {
      response = await fetch(config.url, {
        method: "POST", signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: config.model, messages, temperature: 0.6, max_tokens: 2048 }),
      });
      const data = await response.json();
      text = data.choices?.[0]?.message?.content;
    }
    if (!response.ok) throw new Error(`Provider ${provider} merespons HTTP ${response.status}.`);
    if (typeof text !== "string" || !text.trim()) throw new Error(`Provider ${provider} tidak mengembalikan jawaban.`);
    return { text: text.slice(0, 30_000), model: config.model };
  } finally { clearTimeout(timeout); }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk untuk menggunakan ULTRA." }, { status: 401 });
  if (user.status !== "ACTIVE") return NextResponse.json({ error: "Akun tidak memiliki akses AI saat ini." }, { status: 403 });
  const limit = rateLimit(`ai:${user.id}`, 12, 60_000);
  if (!limit.allowed) return rateLimited(limit.retryAfter);
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Format pesan tidak valid." }, { status: 400 }); }
  const parsed = chatSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Pesan tidak valid." }, { status: 400 });
  const input = parsed.data;
  const available = providerOrder.filter((provider) => Boolean(process.env[providerConfig[provider].env]));
  if (!available.length) return NextResponse.json({ error: "Belum ada AI provider yang terhubung. Developer perlu mengatur secret di server." }, { status: 503 });
  const candidates = input.provider === "auto"
    ? available
    : [input.provider as Provider, ...(input.fallback ? available.filter((provider) => provider !== input.provider) : [])];
  if (!process.env[providerConfig[candidates[0]]?.env]) return NextResponse.json({ error: `Provider ${input.provider} belum dikonfigurasi.` }, { status: 503 });

  let conversationId = input.conversationId;
  try {
    if (conversationId) {
      const conversation = await db.conversation.findFirst({ where: { id: conversationId, ownerId: user.id }, select: { id: true } });
      if (!conversation) return NextResponse.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
    } else {
      const conversation = await db.conversation.create({ data: { ownerId: user.id, title: input.message.slice(0, 72) } });
      conversationId = conversation.id;
    }
    const history = await db.message.findMany({ where: { conversationId, conversation: { ownerId: user.id } }, orderBy: { createdAt: "desc" }, take: 20 });
    const messages: ChatMessage[] = [
      { role: "system", content: "You are ULTRA, a helpful assistant in ALL×PROJECT. Be accurate, clear, and honest about uncertainty. Reply in the user's language." },
      ...history.reverse().map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      { role: "user", content: input.message },
    ];
    let result: { text: string; model: string } | undefined;
    let selected: Provider | undefined;
    const errors: string[] = [];
    for (const candidate of candidates) {
      if (!process.env[providerConfig[candidate].env]) continue;
      try { result = await callProvider(candidate, messages); selected = candidate; break; }
      catch (error) { errors.push(error instanceof Error ? error.message : "Provider gagal."); }
      if (!input.fallback) break;
    }
    if (!result || !selected) {
      console.error("ULTRA provider failures", { userId: user.id, providers: candidates, errors });
      return NextResponse.json({ error: "Semua provider AI gagal merespons. Coba lagi nanti atau pilih provider lain." }, { status: 502 });
    }
    await db.$transaction([
      db.message.create({ data: { conversationId, role: "user", content: input.message } }),
      db.message.create({ data: { conversationId, role: "assistant", content: result.text, provider: selected, model: result.model } }),
      db.usageEvent.create({ data: { userId: user.id, category: "ai.request", quantity: 1, metadata: { provider: selected, model: result.model } } }),
      db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);
    return NextResponse.json({ conversationId, provider: selected, model: result.model, response: result.text });
  } catch (error) {
    console.error("ULTRA request failed", error);
    return NextResponse.json({ error: "ULTRA tidak dapat menyimpan percakapan. Periksa koneksi database lalu coba lagi." }, { status: 503 });
  }
}
