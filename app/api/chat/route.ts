import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveGatewayRoute } from "@/lib/providers/registry";
import type { ChatParams } from "@/lib/providers/types";

export const runtime = "nodejs";

// Internal chat endpoint for the app UI. Authenticated with the app SESSION
// COOKIE (not a gateway `sk-...` key). Streams the model response back as SSE.

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Partial<ChatParams>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "`model` and non-empty `messages` are required." },
      { status: 400 }
    );
  }

  const params: ChatParams = {
    model: body.model,
    messages: body.messages,
    temperature: body.temperature,
    top_p: body.top_p,
    max_tokens: body.max_tokens,
    stream: true,
  };

  try {
    const routeDetails = await resolveGatewayRoute(params.model);
    params.model = routeDetails.upstreamModel;
    params.apiKeys = routeDetails.apiKeys;
    params.baseUrl = routeDetails.baseUrl;
    params.apiHeaders = routeDetails.apiHeaders;

    const provider = routeDetails.provider;
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of provider.chatStream(params)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upstream stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: { message } })}\n\n`)
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Routing or provider instantiation error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
