"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { teamName } from "@/lib/team-name";
import type { GroupVM, MatchVM } from "@/lib/transformers";
import { TeamBadge } from "./team-badge";

export function GroupTable({
  group,
  mini = false,
  matches = [],
}: {
  group: GroupVM;
  mini?: boolean;
  matches?: MatchVM[];
}) {
  const locale = useLocale();
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const tTeams = useTranslations("teams");
  const groupResults = matches
    .filter((match) => match.group === group.group && match.status === "FINISHED")
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff));

  const cols = mini
    ? (["played", "goalDifference", "points"] as const)
    : ([
        "played",
        "won",
        "draw",
        "lost",
        "goalsFor",
        "goalsAgainst",
        "goalDifference",
        "points",
      ] as const);

  return (
    <div className="card-in overflow-hidden rounded-2xl bg-white shadow-lg shadow-pitch-950/30">
      <div className="bg-gradient-to-r from-pitch-600 to-ocean-600 px-4 py-2">
        <h3 className="font-display text-sm uppercase tracking-wider text-white">
          {tc("group", { name: group.group })}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${mini ? "" : "min-w-[34rem]"}`}>
          <thead>
            <tr className="text-[11px] font-bold uppercase text-pitch-950/50">
              <th className="px-3 py-2 text-start" colSpan={2} />
              {cols.map((c) => (
                <th key={c} className="px-1.5 py-2 text-center" title={t(c)}>
                  {t(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.table.map((row) => (
              <tr
                key={row.team.id}
                className="border-t border-pitch-950/5 text-pitch-950"
              >
                <td className="w-6 ps-3 text-center text-xs font-bold text-pitch-950/40">
                  {row.position}
                </td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2 font-bold">
                    <TeamBadge code={row.team.code} crest={row.team.crest} size={20} />
                    <span className="truncate">
                      {teamName(locale, { name: row.team.name, tla: row.team.code }, (n) =>
                        tTeams.has(n) ? tTeams(n) : undefined,
                      )}
                    </span>
                  </span>
                </td>
                {cols.map((c) => (
                  <td
                    key={c}
                    className={`tabular px-1.5 py-2 text-center ${
                      c === "points" ? "font-display text-base" : "text-pitch-950/70"
                    }`}
                  >
                    {c === "goalDifference" && row[c] > 0 ? `+${row[c]}` : row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {groupResults.length > 0 && (
        <div className="border-t border-pitch-950/10 bg-pitch-950/[0.03] px-4 py-3">
          <h4 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-pitch-950/50">
            {t("results")}
          </h4>
          <div className="space-y-1.5">
            {groupResults.map((match) => {
              const homeName = teamName(
                locale,
                { name: match.home.name, tla: match.home.code },
                (n) => (tTeams.has(n) ? tTeams(n) : undefined),
              );
              const awayName = teamName(
                locale,
                { name: match.away.name, tla: match.away.code },
                (n) => (tTeams.has(n) ? tTeams(n) : undefined),
              );

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-bold text-pitch-950 transition-colors hover:bg-pitch-950/5"
                >
                  <span className="truncate">{homeName}</span>
                  <span className="font-display tabular rounded-full bg-pitch-950 px-2 py-0.5 text-sm text-white">
                    {match.score ? `${match.score.home}-${match.score.away}` : tc("fullTime")}
                  </span>
                  <span className="truncate text-end">{awayName}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
