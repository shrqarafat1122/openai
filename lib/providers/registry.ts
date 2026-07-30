import type { Provider } from "./types";
import { openaiProvider } from "./openai";

// Central registry. Adding a provider later = one import + one entry here.
const providers: Record<string, Provider> = {
  [openaiProvider.id]: openaiProvider,
};

// Which provider serves a given model id. For now everything routes to OpenAI;
// later this can inspect a prefix (e.g. "anthropic/...") or a lookup table.
export function providerForModel(_model: string): Provider {
  return openaiProvider;
}

export function getProvider(id: string): Provider | undefined {
  return providers[id];
}

export function allProviders(): Provider[] {
  return Object.values(providers);
}

export const defaultProvider = openaiProvider;
