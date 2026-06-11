"use client";

import { useState } from "react";
import { flagEmoji, isoFromTla } from "@/lib/team-name";

export function TeamBadge({
  code,
  crest,
  size = 28,
}: {
  code: string;
  crest: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  if (!crest || broken) {
    return (
      <span style={{ fontSize: size * 0.8 }} aria-hidden>
        {flagEmoji(isoFromTla(code))}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny crest with emoji fallback on error
    <img
      src={crest}
      alt=""
      width={size}
      height={size}
      className="inline-block object-contain"
      onError={() => setBroken(true)}
    />
  );
}
