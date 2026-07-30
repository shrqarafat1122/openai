// Shared shapes for the provider abstraction. OpenAI-compatible on purpose so
// the gateway can speak the same wire format regardless of upstream provider.

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ModelInfo {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

export interface Provider {
  /** Stable id used in the registry, e.g. "openai". */
  readonly id: string;

  /**
   * Non-streaming completion. Returns an OpenAI-compatible chat.completion
   * object (the raw upstream JSON is fine since we target OpenAI shape).
   */
  chat(params: ChatParams): Promise<unknown>;

  /**
   * Streaming completion. Yields OpenAI-compatible chat.completion.chunk
   * objects. The route layer serializes these as SSE `data:` lines.
   */
  chatStream(params: ChatParams): AsyncIterable<unknown>;

  /** List available models in OpenAI `data[]` shape. */
  listModels(): Promise<ModelInfo[]>;
}
