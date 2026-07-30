import OpenAI from "openai";
import type { ChatParams, ModelInfo, Provider } from "./types";

// One OpenAI client per upstream API key. Keys are tried left-to-right; if a
// call fails with a retryable error (rate limit / invalid key / upstream 5xx)
// we fall back to the next key. This lets us pool several real keys behind the
// single gateway.

let clients: OpenAI[] | null = null;

function loadKeys(): string[] {
  // OPENAI_API_KEYS (comma-separated) wins; fall back to the single-key alias.
  const multi = process.env.OPENAI_API_KEYS;
  const raw = multi && multi.trim() ? multi : process.env.OPENAI_API_KEY || "";
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  // De-dupe so a repeated key doesn't waste a retry slot.
  return [...new Set(keys)];
}

function getClients(): OpenAI[] {
  if (clients) return clients;
  const keys = loadKeys();
  if (keys.length === 0) {
    throw new Error("No OpenAI key set (OPENAI_API_KEYS or OPENAI_API_KEY)");
  }
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  clients = keys.map((apiKey) => new OpenAI({ apiKey, baseURL }));
  return clients;
}

// Should we try the next key for this error? Rate limit (429), auth problems
// (401/403), and upstream faults (5xx) are worth retrying with another key.
// A 400 is a bad request from us — the next key won't fix it, so don't waste it.
function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (typeof status !== "number") return true; // network/unknown → try next
  if (status === 429) return true;
  if (status === 401 || status === 403) return true;
  if (status >= 500) return true;
  return false;
}

// Run `fn` against each client until one succeeds. For streaming, `fn` returns
// the stream object; we only fall back on the initial create() failure, before
// any chunk has been handed to the caller.
async function withFallback<T>(fn: (client: OpenAI) => Promise<T>): Promise<T> {
  const list = getClients();
  let lastErr: unknown;
  for (let i = 0; i < list.length; i++) {
    try {
      return await fn(list[i]);
    } catch (err) {
      lastErr = err;
      if (i < list.length - 1 && isRetryable(err)) continue;
      throw err;
    }
  }
  throw lastErr;
}

export const openaiProvider: Provider = {
  id: "openai",

  async chat(params: ChatParams) {
    return withFallback((client) =>
      client.chat.completions.create({
        model: params.model,
        messages: params.messages as OpenAI.ChatCompletionMessageParam[],
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        stream: false,
      })
    );
  },

  async *chatStream(params: ChatParams) {
    const stream = await withFallback((client) =>
      client.chat.completions.create({
        model: params.model,
        messages: params.messages as OpenAI.ChatCompletionMessageParam[],
        temperature: params.temperature,
        top_p: params.top_p,
        max_tokens: params.max_tokens,
        stream: true,
      })
    );
    for await (const chunk of stream) {
      yield chunk;
    }
  },

  async listModels(): Promise<ModelInfo[]> {
    const res = await withFallback((client) => client.models.list());
    return res.data.map((m) => ({
      id: m.id,
      object: "model" as const,
      created: m.created,
      owned_by: m.owned_by,
    }));
  },
};
