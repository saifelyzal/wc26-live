import { describe, expect, test } from "vitest";
import { LiveHub } from "./live-hub";

describe("LiveHub", () => {
  test("broadcasts events to every subscriber as SSE frames", () => {
    const hub = new LiveHub();
    const a: string[] = [];
    const b: string[] = [];
    hub.subscribe((chunk) => a.push(chunk));
    hub.subscribe((chunk) => b.push(chunk));

    hub.broadcast({ type: "ping" });

    expect(a).toEqual(['data: {"type":"ping"}\n\n']);
    expect(b).toEqual(['data: {"type":"ping"}\n\n']);
  });

  test("stops sending after unsubscribe", () => {
    const hub = new LiveHub();
    const received: string[] = [];
    const unsubscribe = hub.subscribe((chunk) => received.push(chunk));
    unsubscribe();
    hub.broadcast({ type: "ping" });
    expect(received).toEqual([]);
  });

  test("drops subscribers whose write throws (disconnected clients)", () => {
    const hub = new LiveHub();
    const received: string[] = [];
    hub.subscribe(() => {
      throw new Error("client gone");
    });
    hub.subscribe((chunk) => received.push(chunk));

    hub.broadcast({ type: "one" });
    hub.broadcast({ type: "two" });

    expect(received).toHaveLength(2);
    expect(hub.size).toBe(1);
  });
});
