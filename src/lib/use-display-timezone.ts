"use client";

import { useEffect, useState } from "react";

// Must match the timeZone in src/i18n/request.ts so the first client
// render equals the server render; the effect then swaps in the
// browser's zone without a hydration mismatch.
export const SSR_TIME_ZONE = "America/New_York";

export function useDisplayTimeZone(): string {
  const [tz, setTz] = useState(SSR_TIME_ZONE);
  useEffect(() => {
    setTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  return tz;
}

/** YYYY-MM-DD of a date in the given zone (for day grouping). */
export function dayKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}
