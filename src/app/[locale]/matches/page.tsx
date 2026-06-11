import { getLiveServer } from "@/lib/live-server";
import { MatchesList } from "@/components/matches-list";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const server = getLiveServer();
  server.start();
  const matches = await server.getMatches();
  return <MatchesList initial={matches} />;
}
