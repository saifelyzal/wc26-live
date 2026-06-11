import type { MatchVM } from "./transformers";

const KICKOFF_SOON_MS = 10 * 60_000;
// Feeds (especially free tiers) can flip a match to live well after the real
// kickoff; keep polling fast while a kickoff has passed but the match still
// reads UPCOMING, bounded so postponed matches don't fast-poll forever.
const OVERDUE_WINDOW_MS = 3 * 60 * 60_000;

export function nextPollDelay(matches: MatchVM[], now: number): number {
  if (matches.some((m) => m.status === "LIVE")) return 30_000;
  const overdue = matches.some((m) => {
    if (m.status !== "UPCOMING") return false;
    const sinceKickoff = now - Date.parse(m.kickoff);
    return sinceKickoff >= 0 && sinceKickoff <= OVERDUE_WINDOW_MS;
  });
  if (overdue) return 30_000;
  const kickoffSoon = matches.some(
    (m) =>
      m.status === "UPCOMING" &&
      Date.parse(m.kickoff) - now > 0 &&
      Date.parse(m.kickoff) - now <= KICKOFF_SOON_MS,
  );
  return kickoffSoon ? 60_000 : 300_000;
}
