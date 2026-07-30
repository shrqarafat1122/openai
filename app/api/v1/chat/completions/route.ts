import { NextResponse } from "next/server";
import { bearerFromHeader, verifyApiKey } from "@/lib/apiKeys";
import { providerForModel } from "@/lib/providers/registry";
import type { ChatParams } from "@/lib/providers/types";

export const runtime = "nodejs";

// OpenAI-compatible chat completions endpoint. Authenticated with a generated
// `sk-...` bearer key (validated against Firestore). Supports streaming (SSE)
// and non-streaming JSON, matching the OpenAI wire format.

function errorResponse(message: string, status: number, type = "invalid_request_error") {
  return NextResponse.json(
    { error: { message, type, code: null, param: null } },
    { status }
  );
}

export async function POST(req: Request) {
  const rawKey = bearerFromHeader(req.headers.get("authorization"));
  if (!rawKey) {
    return errorResponse("Missing bearer API key.", 401, "authentication_error");
  }

  const keyRecord = await verifyApiKey(rawKey);
  if (!keyRecord) {
    return errorResponse("Invalid or revoked API key.", 401, "authentication_error");
  }

  let body: Partial<ChatParams>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return errorResponse("`model` and non-empty `messages` are required.", 400);
  }

  const params: ChatParams = {
    model: body.model,
    messages: body.messages,
    temperature: body.temperature,
    top_p: body.top_p,
    max_tokens: body.max_tokens,
    stream: !!body.stream,
  };

  const provider = providerForModel(params.model);

  try {
    if (params.stream) {
      const iterator = provider.chatStream(params);
      const encoder = new TextEncoder();

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of iterator) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upstream stream error";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: { message, type: "upstream_error" },
                })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const completion = await provider.chat(params);
    return NextResponse.json(completion);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream error";
    return errorResponse(message, 502, "upstream_error");
  }
}
