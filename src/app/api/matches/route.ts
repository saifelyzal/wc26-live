import { getLiveServer } from "@/lib/live-server";

export async function GET() {
  const server = getLiveServer();
  server.start();
  const state = await server.getMatches();
  return Response.json(
    { type: "snapshot", ...state },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
