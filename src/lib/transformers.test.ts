import { describe, expect, test } from "vitest";
import {
  toMatches,
  toStandings,
  toScorers,
  toBracket,
  diffMatches,
  type MatchVM,
} from "./transformers";
import matchesFixture from "./fixtures/matches.json";
import standingsFixture from "./fixtures/standings.json";
import scorersFixture from "./fixtures/scorers.json";

describe("toMatches", () => {
  const matches = toMatches(matchesFixture);

  test("maps every API match to a view model", () => {
    expect(matches).toHaveLength(6);
  });

  test("maps a live match with simplified status, minute and score", () => {
    const live = matches.find((m) => m.id === 500002)!;
    expect(live.status).toBe("LIVE");
    expect(live.minute).toBe(71);
    expect(live.score).toEqual({ home: 2, away: 1 });
    expect(live.home.code).toBe("MEX");
    expect(live.away.code).toBe("RSA");
    expect(live.group).toBe("A");
  });

  test("treats PAUSED (half-time) as LIVE", () => {
    expect(matches.find((m) => m.id === 500003)!.status).toBe("LIVE");
  });

  test("treats TIMED and SCHEDULED as UPCOMING with null score", () => {
    const upcoming = matches.find((m) => m.id === 500004)!;
    expect(upcoming.status).toBe("UPCOMING");
    expect(upcoming.score).toBeNull();
    expect(matches.find((m) => m.id === 500006)!.status).toBe("UPCOMING");
  });

  test("merges goals and bookings into one chronological event timeline", () => {
    const finished = matches.find((m) => m.id === 500001)!;
    expect(finished.events.map((e) => [e.minute, e.type])).toEqual([
      [31, "goal"],
      [45, "yellow"],
      [58, "penalty"],
      [83, "goal"],
      [88, "red"],
    ]);
    expect(finished.events[0].player).toBe("Mateo Retegui");
    expect(finished.events[0].teamId).toBe(784);
  });
});

describe("toStandings", () => {
  const groups = toStandings(standingsFixture);

  test("maps each group with a short letter name", () => {
    expect(groups.map((g) => g.group)).toEqual(["A", "B"]);
  });

  test("maps table rows", () => {
    const mexico = groups[0].table[0];
    expect(mexico).toMatchObject({
      position: 1,
      played: 1,
      won: 1,
      draw: 0,
      lost: 0,
      points: 3,
      goalsFor: 2,
      goalsAgainst: 1,
      goalDifference: 1,
    });
    expect(mexico.team.code).toBe("MEX");
  });
});

describe("toScorers", () => {
  test("maps scorers with player, team, goals and assists", () => {
    const scorers = toScorers(scorersFixture);
    expect(scorers[0]).toMatchObject({
      player: "Santiago Giménez",
      goals: 2,
      assists: 0,
    });
    expect(scorers[0].team.code).toBe("MEX");
  });
});

describe("toBracket", () => {
  function knockout(id: number, stage: string): MatchVM {
    return {
      id,
      kickoff: "2026-07-01T19:00:00Z",
      status: "UPCOMING",
      minute: null,
      stage,
      group: null,
      matchday: null,
      home: { id: 1, name: "TBD", code: "TBD", crest: "" },
      away: { id: 2, name: "TBD", code: "TBD", crest: "" },
      score: null,
      events: [],
    };
  }

  test("groups knockout matches into ordered rounds, ignoring group stage", () => {
    const groupMatch = toMatches(matchesFixture)[0];
    const bracket = toBracket([
      knockout(2, "FINAL"),
      knockout(3, "SEMI_FINALS"),
      groupMatch,
      knockout(4, "LAST_16"),
      knockout(5, "LAST_32"),
      knockout(6, "QUARTER_FINALS"),
      knockout(7, "THIRD_PLACE"),
    ]);
    expect(bracket.map((r) => r.stage)).toEqual([
      "LAST_32",
      "LAST_16",
      "QUARTER_FINALS",
      "SEMI_FINALS",
      "THIRD_PLACE",
      "FINAL",
    ]);
    expect(bracket.every((r) => r.matches.length === 1)).toBe(true);
  });

  test("returns empty array when no knockout matches exist yet", () => {
    expect(toBracket(toMatches(matchesFixture))).toEqual([]);
  });
});

describe("diffMatches", () => {
  const before = toMatches(matchesFixture);

  test("detects a score change", () => {
    const after = structuredClone(before);
    const live = after.find((m) => m.id === 500002)!;
    live.score = { home: 3, away: 1 };
    const changes = diffMatches(before, after);
    expect(changes).toEqual([
      { matchId: 500002, kind: "score", score: { home: 3, away: 1 } },
    ]);
  });

  test("detects a status change", () => {
    const after = structuredClone(before);
    const kicked = after.find((m) => m.id === 500004)!;
    kicked.status = "LIVE";
    const changes = diffMatches(before, after);
    expect(changes).toEqual([
      { matchId: 500004, kind: "status", status: "LIVE" },
    ]);
  });

  test("reports nothing when nothing changed", () => {
    expect(diffMatches(before, structuredClone(before))).toEqual([]);
  });
});
