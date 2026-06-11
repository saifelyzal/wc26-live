"use client";

import { useLocale, useTranslations } from "next-intl";
import { teamName } from "@/lib/team-name";
import type { GroupVM } from "@/lib/transformers";
import { TeamBadge } from "./team-badge";

export function GroupTable({
  group,
  mini = false,
}: {
  group: GroupVM;
  mini?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const tTeams = useTranslations("teams");

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
      <table className="w-full text-sm">
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
  );
}
