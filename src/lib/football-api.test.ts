import { describe, expect, test, vi } from "vitest";
import { createFootballApi } from "./football-api";
import matchesFixture from "./fixtures/matches.json";

function fakeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function okFetch(json: unknown) {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => json }));
}

describe("createFootballApi in mock mode", () => {
  test("returns fixture matches without hitting the network", async () => {
    const fetchFn = okFetch({});
    const api = createFootballApi({ mock: true, fetchFn });
    const result = await api.getMatches();
    expect(result.data).toHaveLength(6);
    expect(result.stale).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test("returns fixture standings and scorers", async () => {
    const api = createFootballApi({ mock: true });
    expect((await api.getStandings()).data.map((g) => g.group)).toEqual(["A", "B"]);
    expect((await api.getScorers()).data[0].player).toBe("Santiago Giménez");
  });
});

describe("createFootballApi with a real key", () => {
  test("fetches with the auth header and transforms the response", async () => {
    const fetchFn = okFetch(matchesFixture);
    const api = createFootballApi({ apiKey: "secret", fetchFn });
    const result = await api.getMatches();
    expect(result.data[0].home.code).toBe("CAN");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": "secret" } },
    );
  });

  test("serves from cache within the TTL instead of refetching", async () => {
    const clock = fakeClock();
    const fetchFn = okFetch(matchesFixture);
    const api = createFootballApi({ apiKey: "k", fetchFn, now: clock.now });
    await api.getMatches();
    clock.advance(10_000);
    await api.getMatches();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("refetches after the TTL expires", async () => {
    const clock = fakeClock();
    const fetchFn = okFetch(matchesFixture);
    const api = createFootballApi({ apiKey: "k", fetchFn, now: clock.now });
    await api.getMatches();
    clock.advance(31_000);
    await api.getMatches();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("serves stale data when the fetch fails", async () => {
    const clock = fakeClock();
    let fail = false;
    const fetchFn = vi.fn(async () => {
      if (fail) throw new Error("network down");
      return { ok: true, status: 200, json: async () => matchesFixture };
    });
    const api = createFootballApi({ apiKey: "k", fetchFn, now: clock.now });
    const fresh = await api.getMatches();
    expect(fresh.stale).toBe(false);

    fail = true;
    clock.advance(31_000);
    const result = await api.getMatches();
    expect(result.stale).toBe(true);
    expect(result.data).toHaveLength(6);
    expect(result.updatedAt).toBe(fresh.updatedAt);
  });

  test("throws when the fetch fails and no cached data exists", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const api = createFootballApi({ apiKey: "k", fetchFn });
    await expect(api.getMatches()).rejects.toThrow("network down");
  });

  test("serves stale data instead of exceeding the rate budget", async () => {
    const clock = fakeClock();
    const fetchFn = okFetch(matchesFixture);
    const api = createFootballApi({
      apiKey: "k",
      fetchFn,
      now: clock.now,
      rateLimit: { limit: 2, windowMs: 600_000 },
    });
    await api.getMatches();
    clock.advance(31_000);
    await api.getMatches(); // budget now exhausted
    clock.advance(31_000);
    const third = await api.getMatches(); // TTL expired but no budget left
    expect(third.stale).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
