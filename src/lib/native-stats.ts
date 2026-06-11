import type { MatchVM } from "./transformers";

const WC_URL = "https://native-stats.org/competition/WC/";

export type NativeStatsResult = {
  matchId: number;
  score: { home: number; away: number };
};

type FetchText = (url: string) => Promise<{ ok: boolean; text: () => Promise<string> }>;

function decodeHtml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#39;", "'");
}

export function parseNativeStatsResults(html: string): NativeStatsResult[] {
  const normalized = decodeHtml(html);
  const results: NativeStatsResult[] = [];
  const rowPattern = /<tr\b[\s\S]*?<\/tr>/g;

  for (const match of normalized.matchAll(rowPattern)) {
    const row = match[0];
    const matchId = /href":"\/match\/(\d+)"/.exec(row)?.[1];
    const score = /(?:^|>)\s*(\d+)\s*:\s*(\d+)\s*(?:<|$)/.exec(row);
    if (!matchId || !score) continue;

    results.push({
      matchId: Number(matchId),
      score: { home: Number(score[1]), away: Number(score[2]) },
    });
  }

  return results;
}

function withScoreStats(
  match: MatchVM,
  score: NativeStatsResult["score"],
): MatchVM {
  return {
    ...match,
    status: "FINISHED",
    minute: null,
    score: match.score ?? score,
    stats: {
      ...match.stats,
      home: {
        ...match.stats.home,
        goals: Math.max(match.stats.home.goals, score.home),
      },
      away: {
        ...match.stats.away,
        goals: Math.max(match.stats.away.goals, score.away),
      },
    },
  };
}

export function mergeNativeStatsResults(
  matches: MatchVM[],
  results: NativeStatsResult[],
): MatchVM[] {
  if (results.length === 0) return matches;
  const byId = new Map(results.map((result) => [result.matchId, result]));
  return matches.map((match) => {
    const result = byId.get(match.id);
    if (!result) return match;
    if (match.score) return match;
    return withScoreStats(match, result.score);
  });
}

export async function fetchNativeStatsResults(
  fetchText: FetchText = fetch,
): Promise<NativeStatsResult[]> {
  const response = await fetchText(WC_URL);
  if (!response.ok) throw new Error("native-stats.org responded with an error");
  return parseNativeStatsResults(await response.text());
}
