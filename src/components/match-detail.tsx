"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { teamName } from "@/lib/team-name";
import { useLiveMatches, type LiveMatchesState } from "@/lib/use-live-matches";
import type { MatchEventVM, MatchVM } from "@/lib/transformers";
import { MatchStatusBadge } from "./match-card";
import { TeamBadge } from "./team-badge";
import { UpdatedStamp } from "./updated-stamp";

const EVENT_ICON: Record<MatchEventVM["type"], string> = {
  goal: "⚽",
  penalty: "⚽",
  "own-goal": "⚽",
  yellow: "🟨",
  red: "🟥",
};

function EventLabel({ event }: { event: MatchEventVM }) {
  const t = useTranslations("match");
  const key = (
    {
      goal: "goal",
      penalty: "penalty",
      "own-goal": "ownGoal",
      yellow: "yellowCard",
      red: "redCard",
    } as const
  )[event.type];
  return (
    <span className="text-xs font-bold uppercase tracking-wider text-pitch-950/50">
      {t(key)}
    </span>
  );
}

function TeamColumn({ match, side }: { match: MatchVM; side: "home" | "away" }) {
  const locale = useLocale();
  const tTeams = useTranslations("teams");
  const team = match[side];
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamBadge code={team.code} crest={team.crest} size={64} />
      <span className="font-display text-lg uppercase leading-tight">
        {teamName(locale, { name: team.name, tla: team.code }, (n) =>
          tTeams.has(n) ? tTeams(n) : undefined,
        )}
      </span>
    </div>
  );
}

export function MatchDetail({
  initial,
  matchId,
}: {
  initial: LiveMatchesState;
  matchId: number;
}) {
  const t = useTranslations("match");
  const tc = useTranslations("common");
  const tStages = useTranslations("stages");
  const format = useFormatter();
  const state = useLiveMatches(initial);

  const match =
    state.matches.find((m) => m.id === matchId) ??
    initial.matches.find((m) => m.id === matchId)!;

  const events = [...match.events].sort((a, b) => b.minute - a.minute);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white/60">
          {tStages.has(match.stage) ? tStages(match.stage) : match.stage}
          {match.group && <> · {tc("group", { name: match.group })}</>}
          {match.matchday && <> · {tc("matchday", { n: match.matchday })}</>}
        </p>
        <UpdatedStamp updatedAt={state.updatedAt} stale={state.stale} />
      </div>

      {/* Scoreboard hero */}
      <div className="card-in rounded-3xl bg-white p-6 text-pitch-950 shadow-xl shadow-pitch-950/40 sm:p-10">
        <div className="mb-4 flex justify-center">
          <MatchStatusBadge match={match} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
          <TeamColumn match={match} side="home" />
          <div className="text-center">
            {match.score ? (
              <div className="font-display tabular text-6xl leading-none sm:text-7xl">
                {match.score.home}
                <span className="mx-1 text-pitch-950/30 sm:mx-2">–</span>
                {match.score.away}
              </div>
            ) : (
              <div className="font-display text-3xl text-pitch-950/40 sm:text-4xl">
                {format.dateTime(new Date(match.kickoff), {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
            {match.status === "FINISHED" && (
              <p className="mt-2 text-xs font-semibold text-pitch-950/50">
                {format.dateTime(new Date(match.kickoff), {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <TeamColumn match={match} side="away" />
        </div>
      </div>

      {/* Timeline */}
      <section className="card-in rounded-3xl bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="font-display mb-4 text-lg uppercase tracking-wide text-sol-300">
          {t("timeline")}
        </h2>
        {match.status === "UPCOMING" ? (
          <p className="py-6 text-center text-sm text-white/50">
            {t("notStarted")}
          </p>
        ) : events.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">
            {t("noEvents")}
          </p>
        ) : (
          <ol className="space-y-1">
            {events.map((event, i) => {
              const isHome = event.teamId === match.home.id;
              return (
                <li
                  key={`${event.minute}-${event.player}-${i}`}
                  className={`flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-pitch-950 ${
                    isHome ? "me-8 sm:me-24" : "ms-8 sm:ms-24"
                  }`}
                >
                  <span className="font-display tabular w-10 shrink-0 text-end text-sm text-ocean-700">
                    {event.minute}′
                  </span>
                  <span aria-hidden>{EVENT_ICON[event.type]}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {event.player}
                  </span>
                  <EventLabel event={event} />
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
