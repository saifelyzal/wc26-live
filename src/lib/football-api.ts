import { TTLCache, RateBudget } from "./cache";
import {
  toMatches,
  toStandings,
  toScorers,
  type MatchVM,
  type GroupVM,
  type ScorerVM,
} from "./transformers";
import matchesFixture from "./fixtures/matches.json";
import standingsFixture from "./fixtures/standings.json";
import scorersFixture from "./fixtures/scorers.json";

const BASE_URL = "https://api.football-data.org/v4/competitions/WC";

export type ApiResult<T> = { data: T; updatedAt: number; stale: boolean };

type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type FootballApiOptions = {
  apiKey?: string;
  mock?: boolean;
  fetchFn?: FetchLike;
  now?: () => number;
  rateLimit?: { limit: number; windowMs: number };
};

export type FootballApi = {
  getMatches(): Promise<ApiResult<MatchVM[]>>;
  getStandings(): Promise<ApiResult<GroupVM[]>>;
  getScorers(): Promise<ApiResult<ScorerVM[]>>;
};

const TTL = {
  matches: 30_000,
  standings: 5 * 60_000,
  scorers: 5 * 60_000,
};

const MOCK = {
  matches: matchesFixture,
  standings: standingsFixture,
  scorers: scorersFixture,
};

const PATH = {
  matches: "/matches",
  standings: "/standings",
  scorers: "/scorers",
};

export function createFootballApi(options: FootballApiOptions = {}): FootballApi {
  const now = options.now ?? Date.now;
  const fetchFn = options.fetchFn ?? (fetch as unknown as FetchLike);
  const rate = options.rateLimit ?? { limit: 9, windowMs: 60_000 };
  const budget = new RateBudget(rate.limit, rate.windowMs, now);
  const cache = new TTLCache<{ data: unknown; updatedAt: number }>(now);

  async function load<T>(
    kind: keyof typeof PATH,
    transform: (json: unknown) => T,
  ): Promise<ApiResult<T>> {
    if (options.mock) {
      return { data: transform(MOCK[kind]), updatedAt: now(), stale: false };
    }

    const fresh = cache.get(kind);
    if (fresh) {
      return { data: fresh.data as T, updatedAt: fresh.updatedAt, stale: false };
    }

    const stale = cache.getStale(kind);
    if (!budget.tryConsume()) {
      if (stale) {
        return {
          data: stale.value.data as T,
          updatedAt: stale.value.updatedAt,
          stale: true,
        };
      }
      throw new Error("Rate budget exhausted and no cached data available");
    }

    try {
      const response = await fetchFn(`${BASE_URL}${PATH[kind]}`, {
        headers: { "X-Auth-Token": options.apiKey ?? "" },
      });
      if (!response.ok) {
        throw new Error(`football-data.org responded ${response.status}`);
      }
      const data = transform(await response.json());
      const updatedAt = now();
      cache.set(kind, { data, updatedAt }, TTL[kind]);
      return { data, updatedAt, stale: false };
    } catch (error) {
      if (stale) {
        return {
          data: stale.value.data as T,
          updatedAt: stale.value.updatedAt,
          stale: true,
        };
      }
      throw error;
    }
  }

  return {
    getMatches: () => load("matches", (json) => toMatches(json)),
    getStandings: () => load("standings", (json) => toStandings(json)),
    getScorers: () => load("scorers", (json) => toScorers(json)),
  };
}
