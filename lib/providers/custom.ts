import OpenAI from "openai";
import type { ChatParams, ModelInfo, Provider } from "./types";
import { withKeyRotation } from "./fallback";

export const customProvider: Provider = {
  id: "custom",

  async chat(params: ChatParams) {
    const keys = params.apiKeys && params.apiKeys.length > 0 ? params.apiKeys : ["not-needed"];
    const baseURL = params.baseUrl;
    if (!baseURL) throw new Error("Base URL is required for custom providers.");

    return withKeyRotation(
      keys,
      (key) =>
        new OpenAI({
          apiKey: key,
          baseURL,
          defaultHeaders: params.apiHeaders,
        }),
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
    const keys = params.apiKeys && params.apiKeys.length > 0 ? params.apiKeys : ["not-needed"];
    const baseURL = params.baseUrl;
    if (!baseURL) throw new Error("Base URL is required for custom providers.");

    const stream = await withKeyRotation(
      keys,
      (key) =>
        new OpenAI({
          apiKey: key,
          baseURL,
          defaultHeaders: params.apiHeaders,
        }),
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
    return [];
  },
};
