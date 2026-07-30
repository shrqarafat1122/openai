import type { ChatParams, Provider } from "./types";
import { openaiProvider } from "./openai";
import { anthropicProvider } from "./anthropic";
import { customProvider } from "./custom";
import { db } from "../firebase-admin";

const providers: Record<string, Provider> = {
  [openaiProvider.id]: openaiProvider,
  [anthropicProvider.id]: anthropicProvider,
  [customProvider.id]: customProvider,
};

export interface ResolvedRoute {
  provider: Provider;
  apiKeys: string[];
  baseUrl?: string;
  upstreamModel: string;
  apiHeaders?: Record<string, string>;
}

export async function resolveGatewayRoute(requestedModel: string): Promise<ResolvedRoute> {
  let providerDbId: string | null = null;
  let upstreamModel = requestedModel;

  if (requestedModel.includes("/")) {
    const parts = requestedModel.split("/");
    providerDbId = parts[0];
    upstreamModel = parts.slice(1).join("/");
  }

  // Fetch all enabled providers from firestore
  let activeProviders: any[] = [];
  try {
    const snap = await db()
      .collection("providers")
      .where("enabled", "==", true)
      .get();
    activeProviders = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    console.error("Failed to fetch custom providers from DB:", err);
  }

  // If no providers configured in DB, fallback to default env-based OpenAI configuration
  if (activeProviders.length === 0) {
    if (requestedModel.startsWith("claude-")) {
      return {
        provider: anthropicProvider,
        apiKeys: process.env.ANTHROPIC_API_KEY ? [process.env.ANTHROPIC_API_KEY] : [],
        upstreamModel,
      };
    }
    return {
      provider: openaiProvider,
      apiKeys: [], // will fall back to OPENAI_API_KEY/OPENAI_API_KEYS env vars
      baseUrl: process.env.OPENAI_BASE_URL,
      upstreamModel,
    };
  }

  let matchedProviderDoc: any = null;

  if (providerDbId) {
    matchedProviderDoc = activeProviders.find((p) => p.id === providerDbId);
  } else {
    // Fuzzy mapping without prefix
    const lower = requestedModel.toLowerCase();
    if (lower.startsWith("gpt-") || lower.startsWith("o1") || lower.startsWith("o3")) {
      matchedProviderDoc = activeProviders.find((p) => p.providerType === "openai");
    } else if (lower.startsWith("claude-")) {
      matchedProviderDoc = activeProviders.find((p) => p.providerType === "anthropic");
    } else {
      // Find from cached models
      matchedProviderDoc = activeProviders.find((p) =>
        p.cachedModels?.includes(requestedModel)
      );
    }
  }

  // Final fallback to first provider matching search types if nothing matched
  if (!matchedProviderDoc) {
    if (requestedModel.startsWith("claude-")) {
      matchedProviderDoc = activeProviders.find((p) => p.providerType === "anthropic");
    } else {
      matchedProviderDoc = activeProviders.find((p) => p.providerType === "openai") || activeProviders[0];
    }
  }

  if (!matchedProviderDoc) {
    throw new Error(`No enabled provider found that supports model "${requestedModel}"`);
  }

  let provider: Provider;
  switch (matchedProviderDoc.providerType) {
    case "anthropic":
      provider = anthropicProvider;
      break;
    case "custom":
      provider = customProvider;
      break;
    default:
      provider = openaiProvider;
      break;
  }

  return {
    provider,
    apiKeys: matchedProviderDoc.apiKeys || [],
    baseUrl: matchedProviderDoc.baseUrl || undefined,
    upstreamModel,
    apiHeaders: matchedProviderDoc.apiHeaders || undefined,
  };
}

export function providerForModel(_model: string): Provider {
  // Backwards compatibility shim for any single-provider layers
  return openaiProvider;
}

export function getProvider(id: string): Provider | undefined {
  return providers[id];
}

export function allProviders(): Provider[] {
  return Object.values(providers);
}

export const defaultProvider = openaiProvider;
