import { getLiveServer } from "@/lib/live-server";

const HEARTBEAT_MS = 25_000;

export async function GET() {
  const server = getLiveServer();
  server.start();

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      const state = await server.getMatches();
      send(`data: ${JSON.stringify({ type: "snapshot", ...state })}\n\n`);
      unsubscribe = server.hub.subscribe(send);
      heartbeat = setInterval(() => {
        try {
          send(`: ping\n\n`);
        } catch {
          // cancel() handles cleanup; ignore writes to a closed stream
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
