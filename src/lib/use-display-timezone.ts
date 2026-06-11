"use client";

import { useSyncExternalStore } from "react";

// Must match the timeZone in src/i18n/request.ts so server rendering and
// hydration agree; after hydration React swaps in the browser's zone.
export const SSR_TIME_ZONE = "America/New_York";

const subscribe = () => () => {};

export function useDisplayTimeZone(): string {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => SSR_TIME_ZONE,
  );
}

/** YYYY-MM-DD of a date in the given zone (for day grouping). */
export function dayKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}
