import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GOOGLE_AI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    xai: Boolean(process.env.XAI_API_KEY),
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    github: Boolean(process.env.GITHUB_TOKEN),
  };
  let database: "not_configured" | "configured_not_checked" | "reachable" = process.env.DATABASE_URL ? "configured_not_checked" : "not_configured";
  if (process.env.DATABASE_URL) {
    try {
      const { db } = await import("@/lib/db");
      await db.$queryRaw`SELECT 1`;
      database = "reachable";
    } catch { database = "configured_not_checked"; }
  }
  const healthy = database === "reachable";
  return NextResponse.json({
    service: "ALL×PROJECT V8",
    status: healthy ? "operational" : "degraded",
    message: healthy ? "Application and database are responding." : "Database is not currently confirmed reachable. Configure and verify the required services.",
    checks: { database, aiProviders: providers },
    checkedAt: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
