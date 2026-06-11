import { describe, expect, test } from "vitest";
import {
  mergeNativeStatsResults,
  parseNativeStatsResults,
} from "./native-stats";
import { toMatches } from "./transformers";
import matchesFixture from "./fixtures/matches.json";

const html = `
  <tbody id="last_matches" phx-update="stream">
    <tr id="last-375299">
      <th>2026/06/11, 21h00</th>
      <td>Mexico - South Africa</td>
      <td class="whitespace-nowrap"><span phx-click="[[&quot;navigate&quot;,{&quot;href&quot;:&quot;/match/537327&quot;}]]">
        <div><div>2:0</div></div>
      </span></td>
      <td>1.47 / 4.11 / 6.79</td>
    </tr>
    <tr>
      <td>1.</td>
      <td>Mexico</td>
      <td>1</td>
      <td>3</td>
      <td>2</td>
      <td>2:0</td>
    </tr>
  </tbody>
`;

describe("parseNativeStatsResults", () => {
  test("extracts recent match scores by football-data match id", () => {
    expect(parseNativeStatsResults(html)).toEqual([
      { matchId: 537327, score: { home: 2, away: 0 } },
    ]);
  });
});

describe("mergeNativeStatsResults", () => {
  test("backfills missing finished score and basic goal stats", () => {
    const match = {
      ...toMatches(matchesFixture)[0],
      id: 537327,
      status: "FINISHED" as const,
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
    const [merged] = mergeNativeStatsResults([match], [
      { matchId: 537327, score: { home: 2, away: 0 } },
    ]);

    expect(merged.score).toEqual({ home: 2, away: 0 });
    expect(merged.stats.home.goals).toBe(2);
    expect(merged.stats.away.goals).toBe(0);
  });

  test("does not override a primary feed score", () => {
    const match = {
      ...toMatches(matchesFixture)[0],
      id: 537327,
      score: { home: 1, away: 0 },
    };
    const [merged] = mergeNativeStatsResults([match], [
      { matchId: 537327, score: { home: 2, away: 0 } },
    ]);

    expect(merged.score).toEqual({ home: 1, away: 0 });
  });
});
