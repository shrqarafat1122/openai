import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase-admin";
import { signSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let email: string;
  let password: string;
  try {
    const body = await req.json();
    email = String(body.email ?? "").trim().toLowerCase();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  try {
    const snap = await db()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const doc = snap.docs[0];
    const user = doc.data();
    const ok = await bcrypt.compare(password, user.passwordHash ?? "");
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signSession({ uid: doc.id, email: user.email });
    await setSessionCookie(token);

    return NextResponse.json({ ok: true, user: { email: user.email } });
  } catch (err) {
    // Firebase init, Firestore query, bcrypt, or signSession blew up. Without
    // this catch, Next.js returns a bodyless 500 and the client only sees the
    // bare "Login failed (500)" fallback — the real cause stays hidden.
    const detail = err instanceof Error ? err.message : "Unknown server error";
    console.error("[auth/login] failed:", detail);
    return NextResponse.json(
      { error: `Server error during login: ${detail}` },
      { status: 500 }
    );
  }
}
