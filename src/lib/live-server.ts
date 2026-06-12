import { createFootballApi, type FootballApi } from "./football-api";
import { fetchLiveOverlays } from "./espn-live";
import { LiveHub } from "./live-hub";
import { nextPollDelay } from "./poller";
import { simulateTick } from "./live-sim";
import {
  fetchNativeStatsResults,
  mergeNativeStatsResults,
} from "./native-stats";
import { syncMatchRecaps, type RecapSyncSummary } from "./recap-worker";
import { createResultStore, type RememberSummary } from "./result-store";
import {
  diffMatches,
  mergeLiveOverlay,
  settleExpiredMatches,
  type MatchVM,
} from "./transformers";

export type MatchesState = {
  matches: MatchVM[];
  updatedAt: number;
  stale: boolean;
};

export type SyncResultsState = MatchesState & {
  storedResults: number;
  changedResults: number;
  recaps: RecapSyncSummary;
};

const MOCK_TICK_MS = 5_000;

export function needsScoreBackfill(matches: MatchVM[]): boolean {
  return matches.some((match) => match.status === "FINISHED" && !match.score);
}

export class LiveServer {
  readonly hub = new LiveHub();
  readonly mock: boolean;
  private api: FootballApi;
  private tick = 0;
  private baseMatches: MatchVM[] | null = null;
  private current: MatchesState | null = null;
  private lastRemember: RememberSummary = { stored: 0, changed: 0 };
  private resultStore = createResultStore();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private refreshing: Promise<MatchesState> | null = null;

  constructor() {
    this.mock = process.env.MOCK_DATA === "1" || !process.env.FOOTBALL_DATA_API_KEY;
    this.api = createFootballApi({
      mock: this.mock,
      apiKey: process.env.FOOTBALL_DATA_API_KEY,
    });
  }

  start() {
    if (this.timer) return;
    this.loop();
  }

  async getMatches(): Promise<MatchesState> {
    if (this.current) return this.current;
    try {
      return await this.refresh();
    } catch (error) {
      console.error("[live-server] matches unavailable:", error);
      return { matches: [], updatedAt: Date.now(), stale: true };
    }
  }

  async syncResults(): Promise<SyncResultsState> {
    const state = await this.refresh({ includeNativeStats: true });
    return {
      ...state,
      storedResults: this.lastRemember.stored,
      changedResults: this.lastRemember.changed,
      recaps: await syncMatchRecaps(state.matches),
    };
  }

  async getStandings() {
    try {
      return await this.api.getStandings();
    } catch (error) {
      console.error("[live-server] standings unavailable:", error);
      return { data: [], updatedAt: Date.now(), stale: true };
    }
  }

  async getScorers() {
    try {
      return await this.api.getScorers();
    } catch (error) {
      console.error("[live-server] scorers unavailable:", error);
      return { data: [], updatedAt: Date.now(), stale: true };
    }
  }

  private async refresh(options: { includeNativeStats?: boolean } = {}): Promise<MatchesState> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.doRefresh(options).finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh({
    includeNativeStats = false,
  }: {
    includeNativeStats?: boolean;
  } = {}): Promise<MatchesState> {
    const prev = this.current;
    let next: MatchesState;

    if (this.mock) {
      this.tick += 1;
      this.baseMatches ??= (await this.api.getMatches()).data;
      const matches = prev
        ? simulateTick(prev.matches, this.tick)
        : this.baseMatches;
      const hydrated = await this.resultStore.hydrate(matches);
      this.lastRemember = await this.resultStore.remember(hydrated);
      next = { matches: hydrated, updatedAt: Date.now(), stale: false };
    } else {
      const [result, overlays] = await Promise.all([
        this.api.getMatches(),
        // Real-time overlay is best-effort; the primary feed still renders.
        fetchLiveOverlays().catch((error) => {
          console.error("[live-server] ESPN overlay unavailable:", error);
          return [];
        }),
      ]);
      const settled = settleExpiredMatches(
        mergeLiveOverlay(result.data, overlays),
        Date.now(),
      );
      const shouldBackfill = includeNativeStats || needsScoreBackfill(settled);
      const backfilled = shouldBackfill
        ? mergeNativeStatsResults(
            settled,
            await fetchNativeStatsResults().catch((error) => {
              console.error("[live-server] native-stats unavailable:", error);
              return [];
            }),
          )
        : settled;
      const matches = await this.resultStore.hydrate(backfilled);
      this.lastRemember = await this.resultStore.remember(matches);
      next = { matches, updatedAt: Date.now(), stale: result.stale };
    }

    this.current = next;
    if (prev) {
      const changes = diffMatches(prev.matches, next.matches);
      const changed =
        changes.length > 0 ||
        JSON.stringify(prev.matches) !== JSON.stringify(next.matches);
      if (changed) {
        this.hub.broadcast({ type: "matches", ...next, changes });
      }
    }
    return next;
  }

  private async loop() {
    let delay = this.mock ? MOCK_TICK_MS : 60_000;
    try {
      const state = await this.refresh();
      if (!this.mock) delay = nextPollDelay(state.matches, Date.now());
    } catch (error) {
      console.error("[live-server] poll failed:", error);
    }
    this.timer = setTimeout(() => this.loop(), delay);
  }
}

// Survives HMR in dev and is shared across route modules.
const globalStore = globalThis as unknown as { __liveServer?: LiveServer };

export function getLiveServer(): LiveServer {
  globalStore.__liveServer ??= new LiveServer();
  return globalStore.__liveServer;
}
