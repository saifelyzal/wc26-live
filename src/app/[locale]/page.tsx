import { getLiveServer } from "@/lib/live-server";
import { HomeDashboard } from "@/components/home-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const server = getLiveServer();
  server.start();
  const [matches, standings, scorers] = await Promise.all([
    server.getMatches(),
    server.getStandings(),
    server.getScorers(),
  ]);

  return (
    <HomeDashboard
      initial={matches}
      standings={standings.data}
      scorers={scorers.data}
      mock={server.mock}
    />
  );
}
