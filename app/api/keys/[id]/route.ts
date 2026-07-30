import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revokeApiKey } from "@/lib/apiKeys";

export const runtime = "nodejs";

// Revoke a gateway key the caller owns. Session-cookie authenticated.

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await revokeApiKey(session.uid, id);
  if (!ok) {
    return NextResponse.json(
      { error: "Key not found or not owned by you." },
      { status: 404 }
    );
  }

  return NextResponse.json({ revoked: true });
}
