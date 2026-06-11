import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { MatchEventVM, MatchStatsVM, MatchStatus, MatchVM } from "./transformers";

type StoredResult = {
  id: number;
  kickoff: string;
  status: Extract<MatchStatus, "LIVE" | "FINISHED">;
  score: MatchVM["score"];
  events: MatchEventVM[];
  stats: MatchStatsVM;
  updatedAt: number;
};

type StoreFile = {
  version: 1;
  results: StoredResult[];
};

export type RememberSummary = {
  stored: number;
  changed: number;
};

const DEFAULT_PATH = join(process.cwd(), ".data", "match-results.json");

function hasStats(stats: MatchStatsVM): boolean {
  return (
    stats.halfTime != null ||
    stats.home.goals > 0 ||
    stats.home.penalties > 0 ||
    stats.home.ownGoals > 0 ||
    stats.home.totalCards > 0 ||
    stats.away.goals > 0 ||
    stats.away.penalties > 0 ||
    stats.away.ownGoals > 0 ||
    stats.away.totalCards > 0
  );
}

function shouldStore(match: MatchVM): boolean {
  return (
    match.status === "LIVE" ||
    match.status === "FINISHED" ||
    match.score != null ||
    match.events.length > 0 ||
    hasStats(match.stats)
  );
}

function mergeStored(match: MatchVM, stored: StoredResult | undefined): StoredResult {
  return {
    id: match.id,
    kickoff: match.kickoff,
    status: match.status === "LIVE" ? "LIVE" : "FINISHED",
    score: match.score ?? stored?.score ?? null,
    events: match.events.length > 0 ? match.events : (stored?.events ?? []),
    stats: hasStats(match.stats) ? match.stats : (stored?.stats ?? match.stats),
    updatedAt: Date.now(),
  };
}

function sameStoredResult(a: StoredResult, b: StoredResult): boolean {
  return (
    a.kickoff === b.kickoff &&
    a.status === b.status &&
    JSON.stringify(a.score) === JSON.stringify(b.score) &&
    JSON.stringify(a.events) === JSON.stringify(b.events) &&
    JSON.stringify(a.stats) === JSON.stringify(b.stats)
  );
}

export type MatchResultStore = {
  hydrate(matches: MatchVM[]): MatchVM[];
  remember(matches: MatchVM[]): RememberSummary;
};

export class FileResultStore implements MatchResultStore {
  private results: Map<number, StoredResult> | null = null;

  constructor(private readonly path = DEFAULT_PATH) {}

  hydrate(matches: MatchVM[]): MatchVM[] {
    const results = this.read();
    return matches.map((match) => {
      const stored = results.get(match.id);
      if (!stored) return match;

      const useStoredStats = !hasStats(match.stats) && hasStats(stored.stats);
      const storedFinished =
        stored.status === "FINISHED" && match.status !== "LIVE";

      return {
        ...match,
        status: storedFinished ? "FINISHED" : match.status,
        minute: storedFinished ? null : match.minute,
        score: match.score ?? stored.score,
        events: match.events.length > 0 ? match.events : stored.events,
        stats: useStoredStats ? stored.stats : match.stats,
      };
    });
  }

  remember(matches: MatchVM[]): RememberSummary {
    const results = this.read();
    let changed = false;
    let storedCount = 0;
    let changedCount = 0;

    for (const match of matches) {
      if (!shouldStore(match)) continue;
      storedCount += 1;
      const stored = results.get(match.id);
      const next = mergeStored(match, stored);
      if (!stored || !sameStoredResult(stored, next)) {
        results.set(match.id, next);
        changed = true;
        changedCount += 1;
      }
    }

    if (changed) this.write(results);
    return { stored: storedCount, changed: changedCount };
  }

  private read(): Map<number, StoredResult> {
    if (this.results) return this.results;
    if (!existsSync(this.path)) {
      this.results = new Map();
      return this.results;
    }

    const parsed = JSON.parse(readFileSync(this.path, "utf8")) as StoreFile;
    this.results = new Map((parsed.results ?? []).map((r) => [r.id, r]));
    return this.results;
  }

  private write(results: Map<number, StoredResult>) {
    mkdirSync(dirname(this.path), { recursive: true });
    const payload: StoreFile = {
      version: 1,
      results: [...results.values()].sort((a, b) => a.id - b.id),
    };
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`);
    renameSync(tmp, this.path);
  }
}

export function createResultStore(path?: string) {
  return new FileResultStore(path);
}
