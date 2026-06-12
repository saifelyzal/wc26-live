import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { createMatchRecapStore } from "./recap-store";
import {
  buildKeyMoments,
  fallbackSummary,
  generateMatchRecap,
  syncMatchRecaps,
} from "./recap-worker";
import { toMatches } from "./transformers";
import matchesFixture from "./fixtures/matches.json";

const tempDirs: string[] = [];

function tempStore() {
  const dir = mkdtempSync(join(tmpdir(), "wc26-recaps-"));
  tempDirs.push(dir);
  return createMatchRecapStore(join(dir, "match-recaps.json"));
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("recap worker", () => {
  const finished = toMatches(matchesFixture)[0];

  test("builds key moments from events and full-time score", () => {
    const moments = buildKeyMoments(finished);
    expect(moments[0]).toMatchObject({ minute: 31 });
    expect(moments.at(-1)?.text).toContain("Full time");
  });

  test("builds a deterministic fallback summary", () => {
    expect(fallbackSummary(finished)).toContain("Canada 1-2 Italy");
  });

  test("generates and stores a ready recap without OpenAI", async () => {
    const store = tempStore();
    const recap = await generateMatchRecap(finished, { store });

    expect(recap.status).toBe("ready");
    expect(recap.fixture_id).toBe(String(finished.id));
    expect((await store.find(String(finished.id)))?.summary).toBe(recap.summary);
  });

  test("normalizes recap goal stats from the final score", async () => {
    const store = tempStore();
    const match = {
      ...finished,
      score: { home: 2, away: 0 },
      events: [],
      stats: {
        ...finished.stats,
        home: { ...finished.stats.home, goals: 0 },
        away: { ...finished.stats.away, goals: 0 },
      },
    };
    const recap = await generateMatchRecap(match, { store });
    expect(recap.stats).toMatchObject({
      home: { goals: 2 },
      away: { goals: 0 },
    });
  });

  test("syncs only finished matches without regenerating ready recaps", async () => {
    const store = tempStore();
    const matches = toMatches(matchesFixture);

    expect(await syncMatchRecaps(matches, { store })).toEqual({
      candidates: 1,
      generated: 1,
    });
    expect(await syncMatchRecaps(matches, { store })).toEqual({
      candidates: 1,
      generated: 0,
    });
  });
});
