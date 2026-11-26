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
  const database = Boolean(process.env.DATABASE_URL);
  return NextResponse.json({
    service: "ALL×PROJECT V8",
    status: "degraded",
    message: "Initial application foundation is running. Configure and deploy the remaining services before production use.",
    checks: { database: database ? "configured_not_checked" : "not_configured", aiProviders: providers },
    checkedAt: new Date().toISOString(),
  }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
