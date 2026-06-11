"use client";

import { useTranslations } from "next-intl";
import type { BracketRoundVM } from "@/lib/transformers";
import { MatchCard } from "./match-card";

export function BracketView({ rounds }: { rounds: BracketRoundVM[] }) {
  const t = useTranslations("bracket");
  const tStages = useTranslations("stages");

  if (rounds.length === 0) {
    return (
      <div className="card-in mx-auto max-w-xl rounded-3xl bg-white/5 p-10 text-center backdrop-blur-sm">
        <p className="mb-3 text-4xl" aria-hidden>
          🏆
        </p>
        <p className="text-sm leading-relaxed text-white/65">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex snap-x gap-6 overflow-x-auto pb-4">
      {rounds.map((round) => (
        <section key={round.stage} className="w-72 shrink-0 snap-start">
          <h2 className="font-display mb-3 text-base uppercase tracking-wide text-sol-300">
            {tStages.has(round.stage) ? tStages(round.stage) : round.stage}
          </h2>
          <div className="space-y-3">
            {round.matches.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
