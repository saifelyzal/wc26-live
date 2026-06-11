import { describe, expect, test } from "vitest";
import { nextPollDelay } from "./poller";
import { simulateTick } from "./live-sim";
import { toMatches } from "./transformers";
import matchesFixture from "./fixtures/matches.json";

const matches = toMatches(matchesFixture);
const T = Date.parse("2026-06-11T20:00:00Z");

describe("nextPollDelay", () => {
  test("polls every 30s while a match is live", () => {
    expect(nextPollDelay(matches, T)).toBe(30_000);
  });

  test("polls every 60s when kickoff is within 10 minutes", () => {
    const idle = matches
      .filter((m) => m.status === "UPCOMING")
      .map((m) => ({ ...m, kickoff: new Date(T + 9 * 60_000).toISOString() }));
    expect(nextPollDelay(idle, T)).toBe(60_000);
  });

  test("polls every 5 minutes otherwise", () => {
    const idle = matches.filter((m) => m.status === "FINISHED");
    expect(nextPollDelay(idle, T)).toBe(300_000);
  });
});

describe("simulateTick", () => {
  test("advances the minute of live matches without mutating input", () => {
    const next = simulateTick(matches, 1);
    const before = matches.find((m) => m.id === 500002)!;
    const after = next.find((m) => m.id === 500002)!;
    expect(after.minute).toBe(before.minute! + 1);
    expect(before.minute).toBe(71);
  });

  test("scores a goal for a live match every fifth tick", () => {
    const next = simulateTick(matches, 5);
    const after = next.find((m) => m.id === 500002)!;
    expect(after.score!.home + after.score!.away).toBe(4);
    expect(after.events.length).toBe(matches.find((m) => m.id === 500002)!.events.length + 1);
  });

  test("leaves non-live matches untouched", () => {
    const next = simulateTick(matches, 5);
    expect(next.find((m) => m.id === 500004)).toEqual(
      matches.find((m) => m.id === 500004),
    );
  });
});
