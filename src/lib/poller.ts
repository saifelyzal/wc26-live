import type { MatchVM } from "./transformers";

const KICKOFF_SOON_MS = 10 * 60_000;

export function nextPollDelay(matches: MatchVM[], now: number): number {
  if (matches.some((m) => m.status === "LIVE")) return 30_000;
  const kickoffSoon = matches.some(
    (m) =>
      m.status === "UPCOMING" &&
      Date.parse(m.kickoff) - now > 0 &&
      Date.parse(m.kickoff) - now <= KICKOFF_SOON_MS,
  );
  return kickoffSoon ? 60_000 : 300_000;
}
