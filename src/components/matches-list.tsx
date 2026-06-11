"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useLiveMatches, type LiveMatchesState } from "@/lib/use-live-matches";
import { MatchCard } from "./match-card";
import { UpdatedStamp } from "./updated-stamp";

export function MatchesList({ initial }: { initial: LiveMatchesState }) {
  const t = useTranslations("matches");
  const format = useFormatter();
  const state = useLiveMatches(initial);

  const byDate = new Map<string, typeof state.matches>();
  for (const match of [...state.matches].sort((a, b) =>
    a.kickoff.localeCompare(b.kickoff),
  )) {
    const day = match.kickoff.slice(0, 10);
    byDate.set(day, [...(byDate.get(day) ?? []), match]);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
          {t("title")}
        </h1>
        <UpdatedStamp updatedAt={state.updatedAt} stale={state.stale} />
      </div>

      {byDate.size === 0 && (
        <p className="rounded-2xl bg-white/5 p-8 text-center text-white/60">
          {t("noMatches")}
        </p>
      )}

      {[...byDate.entries()].map(([day, matches]) => (
        <section key={day}>
          <h2 className="font-display mb-3 text-lg uppercase tracking-wide text-sol-300">
            {format.dateTime(new Date(`${day}T12:00:00Z`), {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
