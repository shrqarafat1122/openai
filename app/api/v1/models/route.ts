import { NextResponse } from "next/server";
import { bearerFromHeader, verifyApiKey } from "@/lib/apiKeys";
import { defaultProvider } from "@/lib/providers/registry";

export const runtime = "nodejs";

// OpenAI-compatible model list. Bearer-authenticated with a generated key.

export async function GET(req: Request) {
  const rawKey = bearerFromHeader(req.headers.get("authorization"));
  if (!rawKey) {
    return NextResponse.json(
      { error: { message: "Missing bearer API key.", type: "authentication_error" } },
      { status: 401 }
    );
  }

  const keyRecord = await verifyApiKey(rawKey);
  if (!keyRecord) {
    return NextResponse.json(
      { error: { message: "Invalid or revoked API key.", type: "authentication_error" } },
      { status: 401 }
    );
  }

  try {
    const models = await defaultProvider.listModels();
    return NextResponse.json({ object: "list", data: models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream error";
    return NextResponse.json(
      { error: { message, type: "upstream_error" } },
      { status: 502 }
    );
  }
}
