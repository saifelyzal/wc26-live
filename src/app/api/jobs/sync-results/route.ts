import { getLiveServer } from "@/lib/live-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.RESULT_SYNC_SECRET;
  if (!expected) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = request.headers.get("x-sync-secret");
  const urlSecret = new URL(request.url).searchParams.get("secret");

  return bearer === expected || header === expected || urlSecret === expected;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const server = getLiveServer();
  const state = await server.syncResults();
  const finished = state.matches.filter((m) => m.status === "FINISHED").length;
  const scored = state.matches.filter((m) => m.score != null).length;

  return Response.json({
    ok: true,
    updatedAt: state.updatedAt,
    stale: state.stale,
    matches: state.matches.length,
    finished,
    scored,
    storedResults: state.storedResults,
    changedResults: state.changedResults,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
