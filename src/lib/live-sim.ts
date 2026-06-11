import type { MatchVM } from "./transformers";

// Drives fake match progress in MOCK_DATA mode so the live UI can be
// demonstrated without a real feed. Deterministic per tick number.
export function simulateTick(matches: MatchVM[], tick: number): MatchVM[] {
  return matches.map((match) => {
    if (match.status !== "LIVE" || match.minute == null) return match;

    const next: MatchVM = structuredClone(match);
    next.minute = match.minute + 1;

    if (tick % 5 === 0 && next.score) {
      const homeScores = tick % 2 === 0;
      if (homeScores) next.score.home += 1;
      else next.score.away += 1;
      const team = homeScores ? next.home : next.away;
      next.events = [
        ...next.events,
        {
          minute: next.minute,
          type: "goal",
          player: `${team.name} striker`,
          teamId: team.id,
        },
      ];
    }
    return next;
  });
}
