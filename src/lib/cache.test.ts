import { describe, expect, test } from "vitest";
import { TTLCache, RateBudget } from "./cache";

function fakeClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("TTLCache", () => {
  test("returns a fresh value before its TTL expires", () => {
    const clock = fakeClock();
    const cache = new TTLCache<string>(clock.now);
    cache.set("k", "v", 1000);
    clock.advance(999);
    expect(cache.get("k")).toBe("v");
  });

  test("returns undefined after the TTL expires", () => {
    const clock = fakeClock();
    const cache = new TTLCache<string>(clock.now);
    cache.set("k", "v", 1000);
    clock.advance(1001);
    expect(cache.get("k")).toBeUndefined();
  });

  test("getStale returns expired values with their age", () => {
    const clock = fakeClock();
    const cache = new TTLCache<string>(clock.now);
    cache.set("k", "v", 1000);
    clock.advance(5000);
    expect(cache.getStale("k")).toEqual({ value: "v", ageMs: 5000 });
  });

  test("getStale returns undefined for unknown keys", () => {
    const cache = new TTLCache<string>(() => 0);
    expect(cache.getStale("missing")).toBeUndefined();
  });
});

describe("RateBudget", () => {
  test("allows requests up to the limit within the window", () => {
    const clock = fakeClock();
    const budget = new RateBudget(3, 60_000, clock.now);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
  });

  test("frees budget once old requests leave the sliding window", () => {
    const clock = fakeClock();
    const budget = new RateBudget(2, 60_000, clock.now);
    budget.tryConsume();
    budget.tryConsume();
    expect(budget.tryConsume()).toBe(false);
    clock.advance(60_001);
    expect(budget.tryConsume()).toBe(true);
  });
});
