import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createApiKey, listApiKeys } from "@/lib/apiKeys";

export const runtime = "nodejs";

// Session-cookie-authenticated management of gateway `sk-...` keys.
// (Distinct from /v1/* which is bearer-authenticated for external tools.)

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const keys = await listApiKeys(session.uid);
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let name = "";
  try {
    const body = await req.json();
    name = typeof body?.name === "string" ? body.name.trim() : "";
  } catch {
    // Empty body is fine; falls back to a default name.
  }

  const { record, rawKey } = await createApiKey(session.uid, name);
  // rawKey is returned exactly once here — never stored or shown again.
  return NextResponse.json({ key: record, rawKey }, { status: 201 });
}
