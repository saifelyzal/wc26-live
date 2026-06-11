export type TeamVM = { id: number; name: string; code: string; crest: string };

export type MatchEventVM = {
  minute: number;
  type: "goal" | "penalty" | "own-goal" | "yellow" | "red";
  player: string;
  teamId: number;
};

export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED" | "OTHER";

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
    teamId: g.team?.id,
  }));
  const cards: MatchEventVM[] = (match.bookings ?? []).map((b: ApiJson) => ({
    minute: b.minute,
    type: b.card === "RED" ? "red" : "yellow",
    player: b.player?.name ?? "",
    teamId: b.team?.id,
  }));
  return [...goals, ...cards].sort((a, b) => a.minute - b.minute);
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
      events: toEvents(m),
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
