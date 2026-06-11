"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLiveMatches, type LiveMatchesState } from "@/lib/use-live-matches";
import type { GroupVM, ScorerVM } from "@/lib/transformers";
import { MatchCard } from "./match-card";
import { GroupTable } from "./group-table";
import { ScorersTable } from "./scorers-table";
import { UpdatedStamp } from "./updated-stamp";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display mb-3 text-lg uppercase tracking-wide text-white/90">
      {children}
    </h2>
  );
}

export function HomeDashboard({
  initial,
  standings,
  scorers,
  mock,
}: {
  initial: LiveMatchesState;
  standings: GroupVM[];
  scorers: ScorerVM[];
  mock: boolean;
}) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const state = useLiveMatches(initial);

  // Same fixed zone as the i18n formatter, so SSR and client agree on "today".
  const dayInET = (date: Date) =>
    date.toLocaleDateString("en-US", { timeZone: "America/New_York" });
  const live = state.matches.filter((m) => m.status === "LIVE");
  const today = dayInET(new Date());
  const todays = state.matches.filter(
    (m) => dayInET(new Date(m.kickoff)) === today && m.status !== "LIVE",
  );
  const upcoming = state.matches
    .filter((m) => m.status === "UPCOMING")
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("title")}
        </h1>
        <div className="flex items-center gap-3">
          {mock && (
            <span className="rounded-full bg-sol-400/20 px-3 py-1 text-xs font-bold text-sol-300">
              {tc("mockNotice")}
            </span>
          )}
          <UpdatedStamp updatedAt={state.updatedAt} stale={state.stale} />
        </div>
      </div>

      {live.length > 0 && (
        <section>
          <SectionTitle>
            <span className="me-2 inline-block size-2.5 animate-pulse rounded-full bg-rojo-500 align-middle" />
            {t("liveNow")}
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>
          {todays.length > 0 ? t("todaysMatches") : t("upcomingMatches")}
        </SectionTitle>
        {todays.length === 0 && upcoming.length === 0 ? (
          <Link
            href="/matches"
            className="block rounded-2xl bg-white/5 p-8 text-center text-white/60 transition-colors hover:bg-white/10"
          >
            {t("noMatchesToday")}
          </Link>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(todays.length > 0 ? todays : upcoming).map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        )}
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[3fr_2fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>{t("standings")}</SectionTitle>
            <Link
              href="/groups"
              className="text-sm font-semibold text-sol-300 hover:text-sol-400"
            >
              {tc("viewAll")} <span className="inline-block rtl:-scale-x-100">→</span>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {standings.slice(0, 2).map((g) => (
              <GroupTable key={g.group} group={g} mini />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>{t("topScorers")}</SectionTitle>
            <Link
              href="/stats"
              className="text-sm font-semibold text-sol-300 hover:text-sol-400"
            >
              {tc("viewAll")} <span className="inline-block rtl:-scale-x-100">→</span>
            </Link>
          </div>
          <ScorersTable scorers={scorers} limit={5} />
        </section>
      </div>
    </div>
  );
}
