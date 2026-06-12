export type TeamVM = { id: number; name: string; code: string; crest: string };

export type MatchEventVM = {
  minute: number;
  type: "goal" | "penalty" | "own-goal" | "yellow" | "red";
  player: string;
  assist: string | null;
  teamId: number;
};

export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED" | "OTHER";

export type TeamMatchStatsVM = {
  goals: number;
  penalties: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  totalCards: number;
};

export type MatchStatsVM = {
  halfTime: { home: number; away: number } | null;
  home: TeamMatchStatsVM;
  away: TeamMatchStatsVM;
};

export type MatchVM = {
  id: number;
  kickoff: string;
  status: MatchStatus;
  minute: number | null;
  stage: string;
  group: string | null;
  matchday: number | null;
  home: TeamVM;
  away: TeamVM;
  score: { home: number; away: number } | null;
  events: MatchEventVM[];
  stats: MatchStatsVM;
};

export type GroupRowVM = {
  position: number;
  team: TeamVM;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type GroupVM = { group: string; table: GroupRowVM[] };

export type ScorerVM = {
  player: string;
  nationality: string;
  team: TeamVM;
  goals: number;
  assists: number;
  played: number;
};

export type BracketRoundVM = { stage: string; matches: MatchVM[] };

export type LiveOverlay = {
  home: string;
  away: string;
  kickoff: string;
  state: "pre" | "in" | "post";
  minute: number | null;
  score: { home: number; away: number } | null;
};

export type MatchChange =
  | { matchId: number; kind: "score"; score: { home: number; away: number } }
  | { matchId: number; kind: "status"; status: MatchStatus };

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiJson = any;

const KNOCKOUT_ORDER = [
  "LAST_64",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

const AUTO_FINISH_AFTER_MS = 165 * 60_000;
const LIVE_OVERLAY_KICKOFF_TOLERANCE_MS = 2 * 60 * 60_000;

function toTeam(team: ApiJson): TeamVM {
  return {
    id: team.id,
    name: team.shortName ?? team.name,
    code: team.tla ?? "",
    crest: team.crest ?? "",
  };
}

function toStatus(apiStatus: string): MatchStatus {
  switch (apiStatus) {
    case "IN_PLAY":
    case "PAUSED":
      return "LIVE";
    case "TIMED":
    case "SCHEDULED":
      return "UPCOMING";
    case "FINISHED":
      return "FINISHED";
    default:
      return "OTHER";
  }
}

function goalType(apiType: string): MatchEventVM["type"] {
  if (apiType === "PENALTY") return "penalty";
  if (apiType === "OWN") return "own-goal";
  return "goal";
}

function toEvents(match: ApiJson): MatchEventVM[] {
  const goals: MatchEventVM[] = (match.goals ?? []).map((g: ApiJson) => ({
    minute: g.minute,
    type: goalType(g.type),
    player: g.scorer?.name ?? "",
    assist: g.assist?.name ?? null,
    teamId: g.team?.id,
  }));
  const cards: MatchEventVM[] = (match.bookings ?? []).map((b: ApiJson) => ({
    minute: b.minute,
    type: b.card === "RED" ? "red" : "yellow",
    player: b.player?.name ?? "",
    assist: null,
    teamId: b.team?.id,
  }));
  return [...goals, ...cards].sort((a, b) => a.minute - b.minute);
}

function emptyTeamStats(): TeamMatchStatsVM {
  return {
    goals: 0,
    penalties: 0,
    ownGoals: 0,
    yellowCards: 0,
    redCards: 0,
    totalCards: 0,
  };
}

function countEvent(stats: TeamMatchStatsVM, event: MatchEventVM) {
  if (event.type === "goal") stats.goals += 1;
  if (event.type === "penalty") {
    stats.goals += 1;
    stats.penalties += 1;
  }
  if (event.type === "own-goal") stats.ownGoals += 1;
  if (event.type === "yellow") {
    stats.yellowCards += 1;
    stats.totalCards += 1;
  }
  if (event.type === "red") {
    stats.redCards += 1;
    stats.totalCards += 1;
  }
}

function toStats(match: ApiJson, events: MatchEventVM[]): MatchStatsVM {
  const home = emptyTeamStats();
  const away = emptyTeamStats();
  const homeTeamId = match.homeTeam?.id;
  const awayTeamId = match.awayTeam?.id;
  for (const event of events) {
    if (event.teamId === homeTeamId) countEvent(home, event);
    if (event.teamId === awayTeamId) countEvent(away, event);
  }

  const hasHalfTime =
    match.score?.halfTime?.home != null && match.score?.halfTime?.away != null;

  return {
    halfTime: hasHalfTime
      ? { home: match.score.halfTime.home, away: match.score.halfTime.away }
      : null,
    home,
    away,
  };
}

function shortGroup(group: string | null | undefined): string | null {
  if (!group) return null;
  return group.replace(/^GROUP_/, "");
}

export function toMatches(json: ApiJson): MatchVM[] {
  return (json.matches ?? []).map((m: ApiJson): MatchVM => {
    const status = toStatus(m.status);
    const hasScore =
      m.score?.fullTime?.home != null && m.score?.fullTime?.away != null;
    const events = toEvents(m);
    return {
      id: m.id,
      kickoff: m.utcDate,
      status,
      minute: m.minute ?? null,
      stage: m.stage,
      group: shortGroup(m.group),
      matchday: m.matchday ?? null,
      home: toTeam(m.homeTeam),
      away: toTeam(m.awayTeam),
      score: hasScore
        ? { home: m.score.fullTime.home, away: m.score.fullTime.away }
        : null,
      events,
      stats: toStats(m, events),
    };
  });
}

export function toStandings(json: ApiJson): GroupVM[] {
  return (json.standings ?? [])
    .filter((s: ApiJson) => s.type === "TOTAL")
    .map((s: ApiJson): GroupVM => ({
      group: shortGroup(s.group) ?? "",
      table: (s.table ?? []).map(
        (row: ApiJson): GroupRowVM => ({
          position: row.position,
          team: toTeam(row.team),
          played: row.playedGames,
          won: row.won,
          draw: row.draw,
          lost: row.lost,
          points: row.points,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalDifference,
        }),
      ),
    }));
}

export function toScorers(json: ApiJson): ScorerVM[] {
  return (json.scorers ?? []).map(
    (s: ApiJson): ScorerVM => ({
      player: s.player?.name ?? "",
      nationality: s.player?.nationality ?? "",
      team: toTeam(s.team),
      goals: s.goals ?? 0,
      assists: s.assists ?? 0,
      played: s.playedMatches ?? 0,
    }),
  );
}

export function toBracket(matches: MatchVM[]): BracketRoundVM[] {
  return KNOCKOUT_ORDER.filter((stage) =>
    matches.some((m) => m.stage === stage),
  ).map((stage) => ({
    stage,
    matches: matches.filter((m) => m.stage === stage),
  }));
}

/**
 * Overlays real-time state (from ESPN) onto the primary feed's matches.
 * Matches pair by identical kickoff instant plus at least one team code in
 * common. Only upgrades: pre-match overlays and already-finished matches in
 * the primary feed are left untouched.
 */
export function mergeLiveOverlay(
  matches: MatchVM[],
  overlays: LiveOverlay[],
): MatchVM[] {
  if (overlays.length === 0) return matches;
  return matches.map((match) => {
    if (match.status === "FINISHED") return match;
    const overlay = bestLiveOverlay(match, overlays);
    if (!overlay || overlay.state === "pre") return match;
    return {
      ...match,
      status: overlay.state === "in" ? "LIVE" : "FINISHED",
      minute: overlay.state === "in" ? overlay.minute : null,
      score: overlay.score ?? match.score,
    };
  });
}

function bestLiveOverlay(
  match: MatchVM,
  overlays: LiveOverlay[],
): LiveOverlay | undefined {
  const kickoff = Date.parse(match.kickoff);
  let best: { overlay: LiveOverlay; score: number } | null = null;

  for (const overlay of overlays) {
    const overlayKickoff = Date.parse(overlay.kickoff);
    if (!Number.isFinite(kickoff) || !Number.isFinite(overlayKickoff)) continue;
    if (
      Math.abs(overlayKickoff - kickoff) > LIVE_OVERLAY_KICKOFF_TOLERANCE_MS
    ) {
      continue;
    }

    let score = 0;
    if (overlay.home === match.home.code) score += 2;
    if (overlay.away === match.away.code) score += 2;
    if (overlay.home === match.away.code) score += 1;
    if (overlay.away === match.home.code) score += 1;
    if (score === 0) continue;
    if (!best || score > best.score) best = { overlay, score };
  }

  return best?.overlay;
}

export function settleExpiredMatches(matches: MatchVM[], now: number): MatchVM[] {
  return matches.map((match) => {
    if (match.status !== "UPCOMING") return match;
    if (now - Date.parse(match.kickoff) < AUTO_FINISH_AFTER_MS) return match;
    return {
      ...match,
      status: "FINISHED",
      minute: null,
    };
  });
}

export function diffMatches(prev: MatchVM[], next: MatchVM[]): MatchChange[] {
  const prevById = new Map(prev.map((m) => [m.id, m]));
  const changes: MatchChange[] = [];
  for (const match of next) {
    const before = prevById.get(match.id);
    if (!before) continue;
    if (
      match.score &&
      (before.score?.home !== match.score.home ||
        before.score?.away !== match.score.away)
    ) {
      changes.push({ matchId: match.id, kind: "score", score: match.score });
    }
    if (before.status !== match.status) {
      changes.push({ matchId: match.id, kind: "status", status: match.status });
    }
  }
  return changes;
}
