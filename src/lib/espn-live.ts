import { TTLCache } from "./cache";
import type { LiveOverlay } from "./transformers";

// ESPN's public scoreboard: keyless and real-time, used as a live overlay on
// top of football-data.org, whose free tier flips matches to live with delay.
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const TTL_MS = 25_000;

/* eslint-disable @typescript-eslint/no-explicit-any */
type ApiJson = any;

function parseMinute(clock: string | undefined): number | null {
  const n = parseInt(clock ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseScore(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toLiveOverlays(json: ApiJson): LiveOverlay[] {
  const overlays: LiveOverlay[] = [];
  for (const event of json.events ?? []) {
    const competitors = event.competitions?.[0]?.competitors ?? [];
    const home = competitors.find((c: ApiJson) => c.homeAway === "home");
    const away = competitors.find((c: ApiJson) => c.homeAway === "away");
    if (!home || !away) continue;
    const state = event.status?.type?.state;
    if (state !== "pre" && state !== "in" && state !== "post") continue;
    const homeScore = parseScore(home.score);
    const awayScore = parseScore(away.score);
    overlays.push({
      home: home.team?.abbreviation ?? "",
      away: away.team?.abbreviation ?? "",
      kickoff: event.date,
      state,
      minute: parseMinute(event.status?.displayClock),
      score:
        homeScore != null && awayScore != null
          ? { home: homeScore, away: awayScore }
          : null,
    });
  }
  return overlays;
}

const cache = new TTLCache<LiveOverlay[]>();

export async function fetchLiveOverlays(
  fetchFn: typeof fetch = fetch,
): Promise<LiveOverlay[]> {
  const cached = cache.get("scoreboard");
  if (cached) return cached;
  const response = await fetchFn(SCOREBOARD_URL);
  if (!response.ok) throw new Error(`ESPN scoreboard responded ${response.status}`);
  const overlays = toLiveOverlays(await response.json());
  cache.set("scoreboard", overlays, TTL_MS);
  return overlays;
}
