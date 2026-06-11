import { createFootballApi, type FootballApi } from "./football-api";
import { LiveHub } from "./live-hub";
import { nextPollDelay } from "./poller";
import { simulateTick } from "./live-sim";
import { diffMatches, type MatchVM } from "./transformers";

export type MatchesState = {
  matches: MatchVM[];
  updatedAt: number;
  stale: boolean;
};

const MOCK_TICK_MS = 5_000;

export class LiveServer {
  readonly hub = new LiveHub();
  readonly mock: boolean;
  private api: FootballApi;
  private tick = 0;
  private current: MatchesState | null = null;
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
    return this.refresh();
  }

  getStandings() {
    return this.api.getStandings();
  }

  getScorers() {
    return this.api.getScorers();
  }

  private async refresh(): Promise<MatchesState> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<MatchesState> {
    const prev = this.current;
    let next: MatchesState;

    if (this.mock) {
      this.tick += 1;
      const base = prev?.matches ?? (await this.api.getMatches()).data;
      next = {
        matches: prev ? simulateTick(base, this.tick) : base,
        updatedAt: Date.now(),
        stale: false,
      };
    } else {
      const result = await this.api.getMatches();
      next = { matches: result.data, updatedAt: result.updatedAt, stale: result.stale };
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
