import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { RowDataPacket } from "mysql2";
import {
  ensureDatabaseInitialized,
  getMySqlPool,
  hasMySqlConfig,
} from "./mysql";
import type { MatchEventVM, MatchStatsVM, MatchStatus, MatchVM } from "./transformers";

export type StoredResult = {
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

export function hasStats(stats: MatchStatsVM): boolean {
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
  hydrate(matches: MatchVM[]): Promise<MatchVM[]> | MatchVM[];
  remember(matches: MatchVM[]): Promise<RememberSummary> | RememberSummary;
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

type ResultRow = RowDataPacket & {
  fixture_id: string;
  kickoff: Date | string | null;
  status: "LIVE" | "FINISHED";
  score: string | MatchVM["score"] | null;
  events: string | MatchEventVM[] | null;
  stats: string | MatchStatsVM | null;
  updated_at: Date | string;
};

function parseJson<T>(value: string | T | null): T | null {
  if (value == null) return null;
  if (typeof value === "string") return JSON.parse(value) as T;
  return value;
}

function rowToStored(row: ResultRow): StoredResult {
  return {
    id: Number(row.fixture_id),
    kickoff:
      row.kickoff instanceof Date
        ? row.kickoff.toISOString()
        : (row.kickoff ?? ""),
    status: row.status,
    score: parseJson<MatchVM["score"]>(row.score),
    events: parseJson<MatchEventVM[]>(row.events) ?? [],
    stats: parseJson<MatchStatsVM>(row.stats) ?? {
      halfTime: null,
      home: {
        goals: 0,
        penalties: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
        totalCards: 0,
      },
      away: {
        goals: 0,
        penalties: 0,
        ownGoals: 0,
        yellowCards: 0,
        redCards: 0,
        totalCards: 0,
      },
    },
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.getTime()
        : Date.parse(row.updated_at),
  };
}

export class MySqlResultStore implements MatchResultStore {
  async hydrate(matches: MatchVM[]): Promise<MatchVM[]> {
    if (matches.length === 0) return matches;
    await ensureDatabaseInitialized();
    const ids = matches.map((match) => String(match.id));
    const [rows] = await getMySqlPool().query<ResultRow[]>(
      `SELECT fixture_id, kickoff, status, score, events, stats, updated_at
       FROM match_results
       WHERE fixture_id IN (?)`,
      [ids],
    );
    const stored = new Map(rows.map((row) => [Number(row.fixture_id), rowToStored(row)]));

    return matches.map((match) => {
      const result = stored.get(match.id);
      if (!result) return match;

      const useStoredStats = !hasStats(match.stats) && hasStats(result.stats);
      const storedFinished =
        result.status === "FINISHED" && match.status !== "LIVE";

      return {
        ...match,
        status: storedFinished ? "FINISHED" : match.status,
        minute: storedFinished ? null : match.minute,
        score: match.score ?? result.score,
        events: match.events.length > 0 ? match.events : result.events,
        stats: useStoredStats ? result.stats : match.stats,
      };
    });
  }

  async remember(matches: MatchVM[]): Promise<RememberSummary> {
    const candidates = matches.filter(shouldStore);
    if (candidates.length === 0) return { stored: 0, changed: 0 };

    await ensureDatabaseInitialized();
    const pool = getMySqlPool();
    let changed = 0;

    for (const match of candidates) {
      const [rows] = await pool.query<ResultRow[]>(
        `SELECT fixture_id, kickoff, status, score, events, stats, updated_at
         FROM match_results
         WHERE fixture_id = ?
         LIMIT 1`,
        [String(match.id)],
      );
      const existing = rows[0] ? rowToStored(rows[0]) : undefined;
      const next = mergeStored(match, existing);
      if (existing && sameStoredResult(existing, next)) continue;

      await pool.execute(
        `INSERT INTO match_results
          (fixture_id, kickoff, status, score, events, stats)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          kickoff = VALUES(kickoff),
          status = VALUES(status),
          score = VALUES(score),
          events = VALUES(events),
          stats = VALUES(stats)`,
        [
          String(next.id),
          next.kickoff ? new Date(next.kickoff) : null,
          next.status,
          JSON.stringify(next.score),
          JSON.stringify(next.events),
          JSON.stringify(next.stats),
        ],
      );
      changed += 1;
    }

    return { stored: candidates.length, changed };
  }
}

export function createResultStore(path?: string) {
  if (!path && hasMySqlConfig()) return new MySqlResultStore();
  return new FileResultStore(path);
}
