"use client";

import { useLocale, useTranslations } from "next-intl";
import { teamName } from "@/lib/team-name";
import type { ScorerVM } from "@/lib/transformers";
import { TeamBadge } from "./team-badge";

export function ScorersTable({
  scorers,
  limit,
}: {
  scorers: ScorerVM[];
  limit?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("stats");
  const tTeams = useTranslations("teams");
  const rows = limit ? scorers.slice(0, limit) : scorers;

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl bg-white/5 p-6 text-center text-sm text-white/60">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="card-in overflow-hidden rounded-2xl bg-white shadow-lg shadow-pitch-950/30">
      <table className="w-full text-sm text-pitch-950">
        <thead>
          <tr className="text-[11px] font-bold uppercase text-pitch-950/50">
            <th className="px-3 py-2.5 text-start" colSpan={2}>
              {t("player")}
            </th>
            <th className="px-2 py-2.5 text-center">{t("goals")}</th>
            <th className="hidden px-2 py-2.5 text-center sm:table-cell">
              {t("assists")}
            </th>
            <th className="hidden px-2 py-2.5 text-center sm:table-cell">
              {t("played")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={`${s.player}-${s.team.id}`} className="border-t border-pitch-950/5">
              <td className="w-8 ps-3 text-center">
                <span
                  className={`font-display text-sm ${
                    i === 0 ? "text-sol-500" : "text-pitch-950/40"
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="px-2 py-2.5">
                <span className="flex items-center gap-2.5">
                  <TeamBadge code={s.team.code} crest={s.team.crest} size={20} />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{s.player}</span>
                    <span className="block text-xs text-pitch-950/50">
                      {teamName(locale, { name: s.team.name, tla: s.team.code }, (n) =>
                        tTeams.has(n) ? tTeams(n) : undefined,
                      )}
                    </span>
                  </span>
                </span>
              </td>
              <td className="tabular px-2 text-center font-display text-xl">
                {s.goals}
              </td>
              <td className="tabular hidden px-2 text-center text-pitch-950/70 sm:table-cell">
                {s.assists}
              </td>
              <td className="tabular hidden px-2 text-center text-pitch-950/70 sm:table-cell">
                {s.played}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
