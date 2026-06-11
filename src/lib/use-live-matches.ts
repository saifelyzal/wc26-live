"use client";

import { useEffect, useState } from "react";
import type { MatchVM } from "./transformers";

export type LiveMatchesState = {
  matches: MatchVM[];
  updatedAt: number;
  stale: boolean;
};

const RECONNECT_MS = 10_000;
const POLL_FALLBACK_MS = 60_000;

export function useLiveMatches(initial: LiveMatchesState): LiveMatchesState {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const apply = (payload: LiveMatchesState) =>
      setState({
        matches: payload.matches,
        updatedAt: payload.updatedAt,
        stale: payload.stale,
      });

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch("/api/matches");
          if (res.ok) apply(await res.json());
        } catch {
          // keep polling; SSE reconnect is also scheduled
        }
      }, POLL_FALLBACK_MS);
    };

    const connect = () => {
      if (disposed) return;
      source = new EventSource("/api/live");
      source.onopen = stopPolling;
      source.onmessage = (event) => apply(JSON.parse(event.data));
      source.onerror = () => {
        source?.close();
        source = null;
        startPolling();
        retryTimer = setTimeout(connect, RECONNECT_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      source?.close();
      stopPolling();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return state;
}
