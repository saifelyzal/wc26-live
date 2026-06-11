import { getTranslations } from "next-intl/server";
import { getLiveServer } from "@/lib/live-server";
import { toBracket } from "@/lib/transformers";
import { BracketView } from "@/components/bracket-view";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const t = await getTranslations("bracket");
  const server = getLiveServer();
  server.start();
  const matches = await server.getMatches();
  const rounds = toBracket(matches.matches);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
        {t("title")}
      </h1>
      <BracketView rounds={rounds} />
    </div>
  );
}
