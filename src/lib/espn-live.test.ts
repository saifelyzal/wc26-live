import { describe, expect, test } from "vitest";
import { toLiveOverlays } from "./espn-live";
import { mergeLiveOverlay, toMatches, type MatchVM } from "./transformers";
import espnFixture from "./fixtures/espn-scoreboard.json";
import matchesFixture from "./fixtures/matches.json";

describe("toLiveOverlays", () => {
  const overlays = toLiveOverlays(espnFixture);

  test("maps an in-play event with parsed minute and numeric score", () => {
    const mex = overlays.find((o) => o.home === "MEX")!;
    expect(mex).toMatchObject({
      home: "MEX",
      away: "RSA",
      kickoff: "2026-06-11T19:00Z",
      state: "in",
      minute: 45,
      score: { home: 1, away: 0 },
    });
  });

  test("maps a pre-match event with state pre", () => {
    const kor = overlays.find((o) => o.home === "KOR")!;
    expect(kor.state).toBe("pre");
  });
});

describe("mergeLiveOverlay", () => {
  const matches = toMatches(matchesFixture);
  // Fixture match 500006: KOR vs EGY, SCHEDULED, kickoff 2026-06-12T22:00:00Z
  const base = matches.find((m) => m.id === 500006)!;

  function overlayFor(m: MatchVM, extra: object) {
    return {
      home: m.home.code,
      away: m.away.code,
      kickoff: m.kickoff,
      state: "in" as const,
      minute: 12,
      score: { home: 1, away: 0 },
      ...extra,
    };
  }

  test("upgrades an UPCOMING match to LIVE with overlay score and minute", () => {
    const merged = mergeLiveOverlay(matches, [overlayFor(base, {})]);
    const m = merged.find((x) => x.id === 500006)!;
    expect(m.status).toBe("LIVE");
    expect(m.minute).toBe(12);
    expect(m.score).toEqual({ home: 1, away: 0 });
  });

  test("marks a match FINISHED when overlay state is post", () => {
    const merged = mergeLiveOverlay(matches, [
      overlayFor(base, { state: "post", minute: null, score: { home: 2, away: 2 } }),
    ]);
    const m = merged.find((x) => x.id === 500006)!;
    expect(m.status).toBe("FINISHED");
    expect(m.score).toEqual({ home: 2, away: 2 });
  });

  test("ignores pre-match overlays and unmatched matches", () => {
    const merged = mergeLiveOverlay(matches, [
      overlayFor(base, { state: "pre", score: null, minute: null }),
    ]);
    expect(merged).toEqual(matches);
  });

  test("does not downgrade a match the primary feed already says is FINISHED", () => {
    const finished = matches.find((m) => m.id === 500001)!;
    const merged = mergeLiveOverlay(matches, [
      overlayFor(finished, { minute: 90, score: { home: 0, away: 0 } }),
    ]);
    expect(merged.find((m) => m.id === 500001)).toEqual(finished);
  });

  test("matches by kickoff time plus either team code", () => {
    // Same kickoff instant, only away code matches (home differs).
    const merged = mergeLiveOverlay(matches, [
      overlayFor(base, { home: "XXX" }),
    ]);
    expect(merged.find((x) => x.id === 500006)!.status).toBe("LIVE");
  });
});
