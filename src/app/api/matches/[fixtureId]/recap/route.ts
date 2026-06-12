import { createMatchRecapStore } from "@/lib/recap-store";
import { getLiveServer } from "@/lib/live-server";
import { getOrGenerateMatchRecap } from "@/lib/recap-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fixtureId: string }> },
) {
  const { fixtureId } = await params;
  const language = new URL(request.url).searchParams.get("language") ?? "en";
  const store = createMatchRecapStore();
  const recap = await store.find(fixtureId, language);

  const server = getLiveServer();
  const state = await server.getMatches();
  const match = state.matches.find((m) => String(m.id) === fixtureId);
  if (match?.status === "FINISHED") {
    const generated = await getOrGenerateMatchRecap(match, { language, store });
    if (generated) return Response.json(generated);
  }

  if (recap) return Response.json(recap);

  return Response.json({
    id: null,
    fixture_id: fixtureId,
    language,
    summary: null,
    key_moments: [],
    stats: null,
    youtube_video_id: null,
    official_highlight_url: null,
    status: "pending",
    created_at: null,
    updated_at: null,
  });
}
