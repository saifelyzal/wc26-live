import { getTranslations } from "next-intl/server";
import { getLiveServer } from "@/lib/live-server";
import { ScorersTable } from "@/components/scorers-table";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const t = await getTranslations("stats");
  const server = getLiveServer();
  server.start();
  const scorers = await server.getScorers();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
        {t("title")}
      </h1>
      <ScorersTable scorers={scorers.data} />
    </div>
  );
}
