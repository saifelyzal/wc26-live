"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { teamName } from "@/lib/team-name";
import { useDisplayTimeZone } from "@/lib/use-display-timezone";
import type { MatchVM, TeamVM } from "@/lib/transformers";
import { TeamBadge } from "./team-badge";

function PopScore({ value }: { value: number }) {
  const prev = useRef(value);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPop(true);
      const timer = setTimeout(() => setPop(false), 700);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span className={`inline-block ${pop ? "score-pop" : ""}`}>{value}</span>
  );
}

function TeamRow({
  team,
  score,
  winner,
}: {
  team: TeamVM;
  score: number | null;
  winner: boolean;
}) {
  const locale = useLocale();
  const tTeams = useTranslations("teams");

  const name = teamName(locale, { name: team.name, tla: team.code }, (n) =>
    tTeams.has(n) ? tTeams(n) : undefined,
  );

  return (
    <div className="flex items-center gap-2.5">
      <TeamBadge code={team.code} crest={team.crest} size={26} />
      <span
        className={`min-w-0 flex-1 truncate text-sm font-bold ${
          winner ? "text-pitch-950" : "text-pitch-950/80"
        }`}
      >
        {name}
      </span>
      {score != null && (
        <span className="font-display tabular text-2xl leading-none text-pitch-950">
          <PopScore value={score} />
        </span>
      )}
    </div>
  );
}

export function MatchStatusBadge({ match }: { match: MatchVM }) {
  const t = useTranslations("common");
  const format = useFormatter();
  const timeZone = useDisplayTimeZone();

  if (match.status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rojo-500 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-white">
        <span className="live-dot size-1.5 rounded-full bg-white" />
        {t("live")}
        {match.minute != null && (
          <span className="tabular">{match.minute}′</span>
        )}
      </span>
    );
  }
  if (match.status === "FINISHED") {
    return (
      <span className="rounded-full bg-pitch-950/10 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-pitch-950/70">
        {t("fullTime")}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-ocean-600/10 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-ocean-700">
      {format.dateTime(new Date(match.kickoff), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      })}
    </span>
  );
}

export function MatchCard({
  match,
  index = 0,
}: {
  match: MatchVM;
  index?: number;
}) {
  const t = useTranslations("common");
  const tStages = useTranslations("stages");

  const context =
    match.group != null
      ? t("group", { name: match.group })
      : tStages.has(match.stage)
        ? tStages(match.stage)
        : match.stage;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="ticket card-in block rounded-2xl bg-white p-4 shadow-lg shadow-pitch-950/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-pitch-700">
          {context}
        </span>
        <MatchStatusBadge match={match} />
      </div>
      <div className="space-y-2">
        <TeamRow
          team={match.home}
          score={match.score?.home ?? null}
          winner={(match.score?.home ?? 0) >= (match.score?.away ?? 0)}
        />
        <TeamRow
          team={match.away}
          score={match.score?.away ?? null}
          winner={(match.score?.away ?? 0) >= (match.score?.home ?? 0)}
        />
      </div>
    </Link>
  );
}
