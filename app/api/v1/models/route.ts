import { NextResponse } from "next/server";
import { bearerFromHeader, verifyApiKey } from "@/lib/apiKeys";
import { db } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const CACHE_TTL = 15 * 60 * 1000; // 15 mins

interface ProviderRecord {
  id: string;
  providerType: "openai" | "anthropic" | "custom";
  displayName: string;
  baseUrl: string;
  apiKeys: string[];
  apiHeaders?: Record<string, string>;
  enabled: boolean;
  ownerUid: string;
}

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
    const snap = await db()
      .collection("providers")
      .where("ownerUid", "==", keyRecord.ownerUid)
      .where("enabled", "==", true)
      .get();

    const activeProviders = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ProviderRecord, "id">),
    }));

    // If zero custom providers registered, fallback to hardcoded default environment settings
    if (activeProviders.length === 0) {
      const FallbackModels = [
        { id: "gpt-4o-mini", object: "model", created: Date.now(), owned_by: "openai" },
        { id: "gpt-4o", object: "model", created: Date.now(), owned_by: "openai" },
        { id: "o1-mini", object: "model", created: Date.now(), owned_by: "openai" },
      ];
      if (process.env.ANTHROPIC_API_KEY) {
        FallbackModels.push(
          { id: "claude-3-5-sonnet-20241022", object: "model", created: Date.now(), owned_by: "anthropic" },
          { id: "claude-3-5-haiku-20241022", object: "model", created: Date.now(), owned_by: "anthropic" }
        );
      }
      return NextResponse.json({ object: "list", data: FallbackModels });
    }

    const allModelsPromises = activeProviders.map(async (provider) => {
      const cacheRef = db().collection("model_caches").doc(provider.id);
      const cacheSnap = await cacheRef.get();

      let models: any[] = [];
      const cacheData = cacheSnap.data();

      if (cacheSnap.exists && Date.now() - (cacheData?.fetchedAt ?? 0) < CACHE_TTL) {
        models = cacheData?.models || [];
      } else {
        try {
          if (provider.providerType === "anthropic") {
            models = [
              { id: "claude-3-5-sonnet-20241022", owned_by: "anthropic" },
              { id: "claude-3-5-haiku-20241022", owned_by: "anthropic" },
              { id: "claude-3-opus-20240229", owned_by: "anthropic" },
            ];
          } else {
            const baseUrl = provider.baseUrl || "https://api.openai.com/v1";
            // Attempt to query upstream '/models' with first API key configurations
            const res = await fetch(`${baseUrl}/models`, {
              headers: {
                Authorization: `Bearer ${provider.apiKeys[0]}`,
                ...(provider.apiHeaders || {}),
              },
              signal: AbortSignal.timeout(6000), // 6s timeout so a slow provider doesn't block the system
            });

            if (res.ok) {
              const body = await res.json();
              models = body.data || [];
            } else {
              throw new Error(`Upstream status status: ${res.status}`);
            }
          }

          // Cache successfully fetched elements
          await cacheRef.set({
            models,
            fetchedAt: Date.now(),
          });
        } catch (err) {
          console.warn(`Failed to fetch models for provider ${provider.displayName}:`, err);
          // Fall back to stale cached items if query failed
          models = cacheData?.models || [];
        }
      }

      // Add provider prefix to prevent collision in unified mapper
      return models.map((m: any) => ({
        id: `${provider.id}/${m.id}`,
        object: "model",
        created: m.created || Date.now(),
        owned_by: m.owned_by || provider.providerType,
      }));
    });

    const settledOutputs = await Promise.allSettled(allModelsPromises);
    const unifiedList = settledOutputs
      .filter((res): res is PromiseFulfilledResult<any[]> => res.status === "fulfilled")
      .flatMap((res) => res.value);

    // Save dynamic prefixes to the active provider configurations so registry can lookup match lists faster
    for (const provider of activeProviders) {
      const matchPrefix = `${provider.id}/`;
      const providerModels = unifiedList
        .filter((m) => m.id.startsWith(matchPrefix))
        .map((m) => m.id.slice(matchPrefix.length));

      try {
        await db().collection("providers").doc(provider.id).update({
          cachedModels: providerModels,
          updatedAt: Date.now(),
        });
      } catch {}
    }

    return NextResponse.json({ object: "list", data: unifiedList });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err.message || "Gateway model fetch error", type: "gateway_error" } },
      { status: 500 }
    );
  }
}
