"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { teamName } from "@/lib/team-name";
import { useDisplayTimeZone } from "@/lib/use-display-timezone";
import { useLiveMatches, type LiveMatchesState } from "@/lib/use-live-matches";
import type { MatchEventVM, MatchStatsVM, MatchVM } from "@/lib/transformers";
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

function emptyStats() {
  return {
    goals: 0,
    penalties: 0,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
    totalCards: 0,
  };
}

function deriveStats(match: MatchVM): MatchStatsVM {
  const home = emptyStats();
  const away = emptyStats();
  for (const event of match.events) {
    const stats =
      event.teamId === match.home.id
        ? home
        : event.teamId === match.away.id
          ? away
          : null;
    if (!stats) continue;
    if (event.type === "goal") stats.goals += 1;
    if (event.type === "penalty") {
      stats.goals += 1;
      stats.penalties += 1;
    }
    if (event.type === "own-goal") stats.ownGoals += 1;
    if (event.type === "yellow") {
      stats.yellowCards += 1;
      stats.totalCards += 1;
    }
    if (event.type === "red") {
      stats.redCards += 1;
      stats.totalCards += 1;
    }
  }
  return { halfTime: null, home, away };
}

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

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home: React.ReactNode;
  away: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)_4rem] items-center gap-3 border-t border-white/10 py-2 first:border-t-0">
      <span className="font-display tabular text-xl text-white">{home}</span>
      <span className="text-center text-xs font-bold uppercase tracking-wider text-white/55">
        {label}
      </span>
      <span className="font-display tabular text-end text-xl text-white">
        {away}
      </span>
    </div>
  );
}

function TeamColumn({ match, side }: { match: MatchVM; side: "home" | "away" }) {
  const locale = useLocale();
  const tTeams = useTranslations("teams");
  const team = match[side];
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <TeamBadge code={team.code} crest={team.crest} size={52} />
      <span className="font-display max-w-24 text-sm uppercase leading-tight sm:max-w-none sm:text-lg">
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
  const timeZone = useDisplayTimeZone();
  const state = useLiveMatches(initial);

  const match =
    state.matches.find((m) => m.id === matchId) ??
    initial.matches.find((m) => m.id === matchId)!;
  const stats = match.stats ?? deriveStats(match);

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
      <div className="card-in rounded-3xl bg-white p-4 text-pitch-950 shadow-xl shadow-pitch-950/40 sm:p-10">
        <div className="mb-4 flex justify-center">
          <MatchStatusBadge match={match} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-8">
          <TeamColumn match={match} side="home" />
          <div className="text-center">
            {match.score ? (
              <div className="font-display tabular text-4xl leading-none sm:text-7xl">
                {match.score.home}
                <span className="mx-1 text-pitch-950/30 sm:mx-2">–</span>
                {match.score.away}
              </div>
            ) : match.status === "FINISHED" ? (
              <div className="font-display text-2xl uppercase text-pitch-950/45 sm:text-4xl">
                {tc("resultPending")}
              </div>
            ) : (
              <div className="font-display text-3xl text-pitch-950/40 sm:text-4xl">
                {format.dateTime(new Date(match.kickoff), {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone,
                })}
              </div>
            )}
            {match.status === "FINISHED" && (
              <p className="mt-2 text-xs font-semibold text-pitch-950/50">
                {format.dateTime(new Date(match.kickoff), {
                  month: "short",
                  day: "numeric",
                  timeZone,
                })}
              </p>
            )}
          </div>
          <TeamColumn match={match} side="away" />
        </div>
      </div>

      <section className="card-in rounded-3xl bg-white/5 p-5 backdrop-blur-sm sm:p-6">
        <h2 className="font-display mb-4 text-lg uppercase tracking-wide text-sol-300">
          {t("matchStats")}
        </h2>
        {match.status === "UPCOMING" ? (
          <p className="py-6 text-center text-sm text-white/50">
            {t("notStarted")}
          </p>
        ) : (
          <div>
            {stats.halfTime && (
              <StatRow
                label={t("halfTime")}
                home={stats.halfTime.home}
                away={stats.halfTime.away}
              />
            )}
            <StatRow
              label={t("goals")}
              home={stats.home.goals}
              away={stats.away.goals}
            />
            <StatRow
              label={t("penalties")}
              home={stats.home.penalties}
              away={stats.away.penalties}
            />
            <StatRow
              label={t("yellowCards")}
              home={stats.home.yellowCards}
              away={stats.away.yellowCards}
            />
            <StatRow
              label={t("redCards")}
              home={stats.home.redCards}
              away={stats.away.redCards}
            />
            <StatRow
              label={t("totalCards")}
              home={stats.home.totalCards}
              away={stats.away.totalCards}
            />
          </div>
        )}
      </section>

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
                  <span className="min-w-0 flex-1 text-sm font-bold">
                    <span className="block truncate">{event.player}</span>
                    {event.assist && (
                      <span className="block truncate text-xs font-semibold text-pitch-950/45">
                        {t("assist")}: {event.assist}
                      </span>
                    )}
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
