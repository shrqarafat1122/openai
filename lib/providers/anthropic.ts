import Anthropic from "@anthropic-ai/sdk";
import type { ChatParams, ModelInfo, Provider } from "./types";
import { withKeyRotation } from "./fallback";

function translateMessages(messages: ChatParams["messages"]): {
  system?: string;
  anthropicMessages: Anthropic.MessageParam[];
} {
  let system = "";
  const anthropicMessages: Anthropic.MessageParam[] = [];

  // 1. Extract system messages
  const systemContents = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content);
  if (systemContents.length > 0) {
    system = systemContents.join("\n\n");
  }

  // 2. Filter system and translate roles
  const activeMessages = messages.filter((m) => m.role !== "system");

  // Keep track of role to comply with strict alternation
  let lastRole: "user" | "assistant" | null = null;

  for (const msg of activeMessages) {
    // Anthropic only allows "user" or "assistant"
    const role: "user" | "assistant" =
      msg.role === "assistant" ? "assistant" : "user";

    let content: string | Anthropic.ContentBlockParam[] = msg.content;

    // Handle base64 image formats if any are sent
    if (msg.content.startsWith("data:image/")) {
      const match = msg.content.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        content = [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as any,
              data: match[2],
            },
          },
        ];
      }
    }

    if (lastRole === role && anthropicMessages.length > 0) {
      // Merge back-to-back same role messages
      const lastMsg = anthropicMessages[anthropicMessages.length - 1];
      if (typeof lastMsg.content === "string" && typeof content === "string") {
        lastMsg.content += "\n\n" + content;
      } else {
        const prevArray =
          typeof lastMsg.content === "string"
            ? [{ type: "text" as const, text: lastMsg.content }]
            : lastMsg.content;
        const nextArray =
          typeof content === "string"
            ? [{ type: "text" as const, text: content }]
            : content;
        lastMsg.content = [...prevArray, ...nextArray];
      }
    } else {
      anthropicMessages.push({ role, content });
      lastRole = role;
    }
  }

  // Anthropic messages must not be empty. If empty, feed a placeholder user message.
  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: "user", content: "Hello" });
  }

  return { system, anthropicMessages };
}

export const anthropicProvider: Provider = {
  id: "anthropic",

  async chat(params: ChatParams) {
    const { system, anthropicMessages } = translateMessages(params.messages);
    const keys = params.apiKeys || [];

    return withKeyRotation(
      keys,
      (key) => new Anthropic({ apiKey: key }),
      async (client) => {
        const msg = await client.messages.create({
          model: params.model,
          max_tokens: params.max_tokens ?? 4096,
          messages: anthropicMessages,
          system,
          temperature: params.temperature,
          top_p: params.top_p,
        });

        // Translate Anthropic message shape to standard OpenAI Chat Completion shape
        return {
          id: `chatcmpl-${msg.id}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: msg.model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: msg.content
                  .filter((c) => c.type === "text")
                  .map((c: any) => c.text)
                  .join("\n"),
              },
              finish_reason: msg.stop_reason === "end_turn" ? "stop" : msg.stop_reason,
            },
          ],
          usage: {
            prompt_tokens: msg.usage.input_tokens,
            completion_tokens: msg.usage.output_tokens,
            total_tokens: msg.usage.input_tokens + msg.usage.output_tokens,
          },
        };
      }
    );
  },

  async *chatStream(params: ChatParams) {
    const { system, anthropicMessages } = translateMessages(params.messages);
    const keys = params.apiKeys || [];

    const stream = await withKeyRotation(
      keys,
      (key) => new Anthropic({ apiKey: key }),
      async (client) => {
        return client.messages.create({
          model: params.model,
          max_tokens: params.max_tokens ?? 4096,
          messages: anthropicMessages,
          system,
          temperature: params.temperature,
          top_p: params.top_p,
          stream: true,
        });
      }
    );

    let messageId = "";
    for await (const event of stream) {
      if (event.type === "message_start") {
        messageId = event.message.id;
      }

      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        // Return chunk in OpenAI stream format
        yield {
          id: `chatcmpl-${messageId}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: params.model,
          choices: [
            {
              index: 0,
              delta: {
                content: event.delta.text,
              },
              finish_reason: null,
            },
          ],
        };
      }

      if (event.type === "message_delta") {
        yield {
          id: `chatcmpl-${messageId}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: params.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason:
                event.delta.stop_reason === "end_turn" ? "stop" : event.delta.stop_reason,
            },
          ],
        };
      }
    }
  },

  async listModels(): Promise<ModelInfo[]> {
    return [
      { id: "claude-3-5-sonnet-20241022", object: "model", created: Date.now(), owned_by: "anthropic" },
      { id: "claude-3-5-haiku-20241022", object: "model", created: Date.now(), owned_by: "anthropic" },
      { id: "claude-3-opus-20240229", object: "model", created: Date.now(), owned_by: "anthropic" },
    ];
  },
};
