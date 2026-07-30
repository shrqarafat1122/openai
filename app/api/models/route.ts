import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { defaultProvider } from "@/lib/providers/registry";

export const runtime = "nodejs";

// Internal model list for the app UI. Session-cookie authenticated (the
// bearer-authenticated mirror for external tools lives at /v1/models).

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const models = await defaultProvider.listModels();
    // Chat-capable models only, newest-looking first, to keep the picker tidy.
    const chatModels = models
      .filter((m) => m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3"))
      .sort((a, b) => a.id.localeCompare(b.id));
    return NextResponse.json({ models: chatModels.length ? chatModels : models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
