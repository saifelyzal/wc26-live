import { getTranslations, setRequestLocale } from "next-intl/server";
import { teamName, flagEmoji } from "@/lib/team-name";
import history from "@/data/history.json";

type HistoryTeam = { code?: string; name: string };

function Team({
  team,
  locale,
  overrides,
}: {
  team: HistoryTeam;
  locale: string;
  overrides: (name: string) => string | undefined;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold">
      <span aria-hidden>{team.code ? flagEmoji(team.code) : "🏳️"}</span>
      {teamName(locale, { name: team.name, iso2: team.code }, overrides)}
    </span>
  );
}

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("history");
  const tTeams = await getTranslations("teams");
  const overrides = (name: string) =>
    tTeams.has(name) ? tTeams(name) : undefined;

  const tournaments = [...history.tournaments].reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-white/55">{t("subtitle")}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((cup, i) => (
          <article
            key={cup.year}
            className="card-in overflow-hidden rounded-2xl bg-white text-pitch-950 shadow-lg shadow-pitch-950/30"
            style={{ animationDelay: `${Math.min(i, 9) * 50}ms` }}
          >
            <header className="flex items-baseline justify-between gap-2 bg-gradient-to-r from-pitch-600 to-ocean-600 px-5 py-3 text-white">
              <span className="font-display text-3xl">{cup.year}</span>
              <span className="truncate text-xs font-semibold text-white/80">
                {t("hosts")}:{" "}
                {cup.hosts
                  .map((h) =>
                    teamName(locale, { name: h.name, iso2: h.code }, overrides),
                  )
                  .join(" · ")}
              </span>
            </header>

            <div className="space-y-3 px-5 py-4 text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="text-pitch-950/50">{t("winner")}</span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden>🏆</span>
                  <Team team={cup.winner} locale={locale} overrides={overrides} />
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-pitch-950/50">{t("final")}</span>
                <span className="font-display tabular text-base">
                  {cup.finalScore}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-pitch-950/50">{t("runnerUp")}</span>
                <Team team={cup.runnerUp} locale={locale} overrides={overrides} />
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-pitch-950/50">{t("third")}</span>
                <Team team={cup.third} locale={locale} overrides={overrides} />
              </p>
              <p className="flex items-start justify-between gap-2">
                <span className="shrink-0 text-pitch-950/50">
                  {t("topScorer")}
                </span>
                <span className="text-end">
                  {cup.topScorers
                    .map((s) => `${s.player} (${s.goals})`)
                    .join(", ")}
                </span>
              </p>
            </div>

            <footer className="ticket flex justify-between gap-2 border-t border-pitch-950/10 px-5 py-2.5 text-xs font-semibold text-pitch-950/50">
              <span>{t("teams", { n: cup.teams })}</span>
              <span>{t("matches", { n: cup.matches })}</span>
              <span>{t("goals", { n: cup.goals })}</span>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
