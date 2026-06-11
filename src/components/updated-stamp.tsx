"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

export function UpdatedStamp({
  updatedAt,
  stale,
}: {
  updatedAt: number;
  stale: boolean;
}) {
  const t = useTranslations("common");
  const format = useFormatter();
  // Re-render periodically so the relative time stays honest.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Live pushes can carry an updatedAt newer than our last clock sample;
  // clamp so the stamp never reads as a future time.
  const time = format.relativeTime(updatedAt, Math.max(now, updatedAt));

  if (stale) {
    return (
      <p
        suppressHydrationWarning
        className="rounded-lg bg-sol-400/15 px-3 py-1.5 text-xs font-semibold text-sol-300"
      >
        ⚠ {t("staleNotice", { time })}
      </p>
    );
  }
  return (
    <p suppressHydrationWarning className="text-xs font-medium text-white/50">
      {t("lastUpdated", { time })}
    </p>
  );
}
