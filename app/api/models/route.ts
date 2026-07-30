import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const CACHE_TTL = 15 * 60 * 1000;

interface ProviderRecord {
  id: string;
  providerType: "openai" | "anthropic" | "custom";
  displayName: string;
  baseUrl: string;
  apiKeys: string[];
  apiHeaders?: Record<string, string>;
  manualModels?: string[];
  enabled: boolean;
  ownerUid: string;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const snap = await db()
      .collection("providers")
      .where("ownerUid", "==", session.uid)
      .where("enabled", "==", true)
      .get();

    const activeProviders = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ProviderRecord, "id">),
    }));

    if (activeProviders.length === 0) {
      // Default fallback list
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
      return NextResponse.json({ models: FallbackModels });
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
          } else if (provider.manualModels && provider.manualModels.length > 0) {
            // Provider supplied an explicit model list — use it verbatim and
            // skip the /models probe (many OpenAI-compatible backends only
            // implement /chat/completions, not /models).
            models = provider.manualModels.map((id: string) => ({
              id,
              owned_by: provider.providerType,
            }));
          } else {
            const baseUrl = (provider.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
            const res = await fetch(`${baseUrl}/models`, {
              headers: {
                Authorization: `Bearer ${provider.apiKeys[0]}`,
                ...(provider.apiHeaders || {}),
              },
              signal: AbortSignal.timeout(6000),
            });

            if (res.ok) {
              const body = await res.json();
              models = body.data || [];
            } else {
              throw new Error(`Upstream status: ${res.status}`);
            }
          }

          // Only cache non-empty results so a transient failure doesn't pin an
          // empty list for the full TTL.
          if (models.length > 0) {
            await cacheRef.set({
              models,
              fetchedAt: Date.now(),
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch models for group: ${provider.displayName}`, err);
          models = cacheData?.models || [];
        }
      }

      return models.map((m: any) => ({
        id: `${provider.id}/${m.id}`,
        object: "model",
        created: m.created || Date.now(),
        owned_by: m.owned_by || provider.providerType,
        providerName: provider.displayName, // Extra helper for grouping picker in UI
      }));
    });

    const settledOutputs = await Promise.allSettled(allModelsPromises);
    const unifiedList = settledOutputs
      .filter((res): res is PromiseFulfilledResult<any[]> => res.status === "fulfilled")
      .flatMap((res) => res.value)
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ models: unifiedList });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load models list." }, { status: 502 });
  }
}
