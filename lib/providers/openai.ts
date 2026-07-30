import OpenAI from "openai";
import type { ChatParams, ModelInfo, Provider } from "./types";
import { withKeyRotation } from "./fallback";

function loadEnvKeys(): string[] {
  const multi = process.env.OPENAI_API_KEYS;
  const raw = multi && multi.trim() ? multi : process.env.OPENAI_API_KEY || "";
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return [...new Set(keys)];
}

export const openaiProvider: Provider = {
  id: "openai",

  async chat(params: ChatParams) {
    const keys = params.apiKeys && params.apiKeys.length > 0 ? params.apiKeys : loadEnvKeys();
    if (keys.length === 0) {
      throw new Error("No OpenAI API keys configured.");
    }
    const baseURL = params.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    return withKeyRotation(
      keys,
      (key) => new OpenAI({ apiKey: key, baseURL }),
      (client) =>
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
    const keys = params.apiKeys && params.apiKeys.length > 0 ? params.apiKeys : loadEnvKeys();
    if (keys.length === 0) {
      throw new Error("No OpenAI API keys configured.");
    }
    const baseURL = params.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    const stream = await withKeyRotation(
      keys,
      (key) => new OpenAI({ apiKey: key, baseURL }),
      (client) =>
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
    const keys = loadEnvKeys();
    if (keys.length === 0) return [];

    const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const client = new OpenAI({ apiKey: keys[0], baseURL });
    const res = await client.models.list();
    return res.data.map((m) => ({
      id: m.id,
      object: "model" as const,
      created: m.created,
      owned_by: m.owned_by,
    }));
  },
};
