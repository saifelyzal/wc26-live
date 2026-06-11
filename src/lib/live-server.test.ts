import { describe, expect, test } from "vitest";
import { needsScoreBackfill } from "./live-server";
import { toMatches } from "./transformers";
import matchesFixture from "./fixtures/matches.json";

describe("needsScoreBackfill", () => {
  test("detects finished matches with missing scores", () => {
    const match = {
      ...toMatches(matchesFixture)[0],
      status: "FINISHED" as const,
      score: null,
    };
    expect(needsScoreBackfill([match])).toBe(true);
  });

  test("ignores finished matches that already have scores", () => {
    const match = toMatches(matchesFixture)[0];
    expect(needsScoreBackfill([match])).toBe(false);
  });
});
