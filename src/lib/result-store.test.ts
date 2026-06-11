import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createResultStore } from "./result-store";
import { toMatches, type MatchVM } from "./transformers";
import matchesFixture from "./fixtures/matches.json";

const tempDirs: string[] = [];

function storePath() {
  const dir = mkdtempSync(join(tmpdir(), "wc26-results-"));
  tempDirs.push(dir);
  return join(dir, "match-results.json");
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

function mexicoMatch(): MatchVM {
  return toMatches(matchesFixture).find((m) => m.id === 500002)!;
}

describe("ResultStore", () => {
  test("hydrates an incomplete finished feed result from a stored live score", () => {
    const store = createResultStore(storePath());
    const live = mexicoMatch();
    store.remember([live]);

    const incompleteFinished: MatchVM = {
      ...live,
      status: "FINISHED",
      minute: null,
      score: null,
      events: [],
      stats: {
        halfTime: null,
        home: {
          goals: 0,
          penalties: 0,
          ownGoals: 0,
          yellowCards: 0,
          redCards: 0,
          totalCards: 0,
        },
        away: {
          goals: 0,
          penalties: 0,
          ownGoals: 0,
          yellowCards: 0,
          redCards: 0,
          totalCards: 0,
        },
      },
    };

    const [hydrated] = store.hydrate([incompleteFinished]);
    expect(hydrated.status).toBe("FINISHED");
    expect(hydrated.score).toEqual({ home: 2, away: 1 });
    expect(hydrated.events).toHaveLength(live.events.length);
    expect(hydrated.stats.home.goals).toBe(2);
    expect(hydrated.stats.away.goals).toBe(1);
  });

  test("keeps a fresh feed score instead of replacing it with stored data", () => {
    const store = createResultStore(storePath());
    const live = mexicoMatch();
    store.remember([live]);

    const corrected: MatchVM = {
      ...live,
      status: "FINISHED",
      minute: null,
      score: { home: 3, away: 1 },
    };

    const [hydrated] = store.hydrate([corrected]);
    expect(hydrated.score).toEqual({ home: 3, away: 1 });
  });

  test("reports no changed rows when remembered data is unchanged", () => {
    const store = createResultStore(storePath());
    const live = mexicoMatch();

    expect(store.remember([live])).toEqual({ stored: 1, changed: 1 });
    expect(store.remember([live])).toEqual({ stored: 1, changed: 0 });
  });
});
