import { notFound } from "next/navigation";
import { getLiveServer } from "@/lib/live-server";
import { MatchDetail } from "@/components/match-detail";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  const server = getLiveServer();
  server.start();
  const matches = await server.getMatches();

  if (!matches.matches.some((m) => m.id === matchId)) notFound();

  return <MatchDetail initial={matches} matchId={matchId} />;
}
