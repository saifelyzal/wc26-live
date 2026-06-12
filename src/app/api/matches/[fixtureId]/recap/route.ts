import { createMatchRecapStore } from "@/lib/recap-store";

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
