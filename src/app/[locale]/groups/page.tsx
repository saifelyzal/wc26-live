import { getTranslations } from "next-intl/server";
import { getLiveServer } from "@/lib/live-server";
import { GroupTable } from "@/components/group-table";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const t = await getTranslations("groups");
  const server = getLiveServer();
  server.start();
  const [standings, matches] = await Promise.all([
    server.getStandings(),
    server.getMatches(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
        {t("title")}
      </h1>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {standings.data.map((group) => (
          <GroupTable key={group.group} group={group} matches={matches.matches} />
        ))}
      </div>
    </div>
  );
}
