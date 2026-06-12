import { getLiveServer } from "@/lib/live-server";
import { authorizedJobRequest } from "@/lib/job-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  if (!authorizedJobRequest(request)) {
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
    recapCandidates: state.recaps.candidates,
    recapsGenerated: state.recaps.generated,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
