import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const COLLECTION = "providers";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const snap = await db()
      .collection(COLLECTION)
      .where("ownerUid", "==", session.uid)
      .get();

    const list = snap.docs.map((doc) => {
      const data = doc.data();
      // Mask keys for security before returning to client
      const apiKeys = (data.apiKeys || []).map((k: string) => {
        if (k.length <= 8) return "••••••••";
        return k.slice(0, 4) + "••••" + k.slice(-4);
      });

      return {
        id: doc.id,
        ownerUid: data.ownerUid,
        providerType: data.providerType,
        displayName: data.displayName,
        baseUrl: data.baseUrl,
        apiKeys, // masked
        apiHeaders: data.apiHeaders || {},
        manualModels: data.manualModels || [],
        enabled: !!data.enabled,
        createdAt: data.createdAt || 0,
      };
    });

    // Sort by creation time
    list.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ providers: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load providers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { providerType, displayName, baseUrl, apiKeys, apiHeaders, enabled, manualModels } = body;

    // Validation
    if (!providerType || !["openai", "anthropic", "custom"].includes(providerType)) {
      return NextResponse.json({ error: "Invalid provider type" }, { status: 400 });
    }

    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    if (!Array.isArray(apiKeys) || apiKeys.length === 0 || apiKeys.some((k) => !k.trim())) {
      return NextResponse.json({ error: "At least one valid API key is required" }, { status: 400 });
    }

    if (providerType === "custom" && (!baseUrl || typeof baseUrl !== "string" || !baseUrl.trim())) {
      return NextResponse.json({ error: "Base URL is required for custom providers" }, { status: 400 });
    }

    const cleanBaseUrl = baseUrl ? baseUrl.trim() : "";
    const cleanKeys = apiKeys.map((k) => k.trim());
    const cleanManualModels = Array.isArray(manualModels)
      ? manualModels.map((m: unknown) => String(m).trim()).filter(Boolean)
      : [];

    const docData = {
      ownerUid: session.uid,
      providerType,
      displayName: displayName.trim(),
      baseUrl: cleanBaseUrl,
      apiKeys: cleanKeys,
      apiHeaders: apiHeaders || {},
      manualModels: cleanManualModels,
      enabled: enabled !== false, // default true
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await db().collection(COLLECTION).add(docData);

    return NextResponse.json(
      {
        provider: {
          id: docRef.id,
          ...docData,
          // Send masked keys back
          apiKeys: cleanKeys.map((k) => {
            if (k.length <= 8) return "••••••••";
            return k.slice(0, 4) + "••••" + k.slice(-4);
          }),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create provider" }, { status: 500 });
  }
}
