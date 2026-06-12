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

export type RecapStatus = "pending" | "ready" | "error";

export type RecapKeyMoment = {
  minute: number | null;
  text: string;
};

export type MatchRecap = {
  id: string;
  fixture_id: string;
  language: string;
  summary: string | null;
  key_moments: RecapKeyMoment[];
  stats: unknown;
  youtube_video_id: string | null;
  official_highlight_url: string | null;
  status: RecapStatus;
  created_at: string;
  updated_at: string;
};

export type MatchRecapInput = {
  fixture_id: string;
  language?: string;
  summary?: string | null;
  key_moments?: RecapKeyMoment[];
  stats?: unknown;
  youtube_video_id?: string | null;
  official_highlight_url?: string | null;
  status?: RecapStatus;
};

type StoreFile = {
  version: 1;
  recaps: MatchRecap[];
};

export type MatchRecapStore = {
  find(fixtureId: string, language?: string): Promise<MatchRecap | null> | MatchRecap | null;
  upsert(input: MatchRecapInput): Promise<MatchRecap> | MatchRecap;
};

const DEFAULT_PATH = join(process.cwd(), ".data", "match-recaps.json");

function createId() {
  return crypto.randomUUID();
}

function recapKey(fixtureId: string, language: string) {
  return `${fixtureId}:${language}`;
}

export class FileMatchRecapStore implements MatchRecapStore {
  private recaps: Map<string, MatchRecap> | null = null;

  constructor(private readonly path = DEFAULT_PATH) {}

  find(fixtureId: string, language = "en"): MatchRecap | null {
    return this.read().get(recapKey(fixtureId, language)) ?? null;
  }

  upsert(input: MatchRecapInput): MatchRecap {
    const language = input.language ?? "en";
    const now = new Date().toISOString();
    const recaps = this.read();
    const key = recapKey(input.fixture_id, language);
    const existing = recaps.get(key);
    const next: MatchRecap = {
      id: existing?.id ?? createId(),
      fixture_id: input.fixture_id,
      language,
      summary: input.summary ?? existing?.summary ?? null,
      key_moments: input.key_moments ?? existing?.key_moments ?? [],
      stats: input.stats ?? existing?.stats ?? null,
      youtube_video_id: input.youtube_video_id ?? existing?.youtube_video_id ?? null,
      official_highlight_url:
        input.official_highlight_url ?? existing?.official_highlight_url ?? null,
      status: input.status ?? existing?.status ?? "pending",
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    recaps.set(key, next);
    this.write(recaps);
    return next;
  }

  private read(): Map<string, MatchRecap> {
    if (this.recaps) return this.recaps;
    if (!existsSync(this.path)) {
      this.recaps = new Map();
      return this.recaps;
    }

    const parsed = JSON.parse(readFileSync(this.path, "utf8")) as StoreFile;
    this.recaps = new Map(
      (parsed.recaps ?? []).map((recap) => [
        recapKey(recap.fixture_id, recap.language),
        recap,
      ]),
    );
    return this.recaps;
  }

  private write(recaps: Map<string, MatchRecap>) {
    mkdirSync(dirname(this.path), { recursive: true });
    const payload: StoreFile = {
      version: 1,
      recaps: [...recaps.values()].sort((a, b) =>
        a.fixture_id.localeCompare(b.fixture_id) || a.language.localeCompare(b.language),
      ),
    };
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`);
    renameSync(tmp, this.path);
  }
}

type RecapRow = RowDataPacket & {
  id: string;
  fixture_id: string;
  language: string;
  summary: string | null;
  key_moments: string | RecapKeyMoment[] | null;
  stats: string | unknown | null;
  youtube_video_id: string | null;
  official_highlight_url: string | null;
  status: RecapStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

function parseJson<T>(value: string | T | null): T | null {
  if (value == null) return null;
  if (typeof value === "string") return JSON.parse(value) as T;
  return value;
}

function dateString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function rowToRecap(row: RecapRow): MatchRecap {
  return {
    id: row.id,
    fixture_id: row.fixture_id,
    language: row.language,
    summary: row.summary,
    key_moments: parseJson<RecapKeyMoment[]>(row.key_moments) ?? [],
    stats: parseJson<unknown>(row.stats),
    youtube_video_id: row.youtube_video_id,
    official_highlight_url: row.official_highlight_url,
    status: row.status,
    created_at: dateString(row.created_at),
    updated_at: dateString(row.updated_at),
  };
}

export class MySqlMatchRecapStore implements MatchRecapStore {
  async find(fixtureId: string, language = "en"): Promise<MatchRecap | null> {
    await ensureDatabaseInitialized();
    const [rows] = await getMySqlPool().query<RecapRow[]>(
      `SELECT id, fixture_id, language, summary, key_moments, stats,
              youtube_video_id, official_highlight_url, status, created_at, updated_at
       FROM match_recaps
       WHERE fixture_id = ? AND language = ?
       LIMIT 1`,
      [fixtureId, language],
    );
    return rows[0] ? rowToRecap(rows[0]) : null;
  }

  async upsert(input: MatchRecapInput): Promise<MatchRecap> {
    await ensureDatabaseInitialized();
    const language = input.language ?? "en";
    const existing = await this.find(input.fixture_id, language);
    const now = new Date().toISOString();
    const next: MatchRecap = {
      id: existing?.id ?? createId(),
      fixture_id: input.fixture_id,
      language,
      summary: input.summary ?? existing?.summary ?? null,
      key_moments: input.key_moments ?? existing?.key_moments ?? [],
      stats: input.stats ?? existing?.stats ?? null,
      youtube_video_id: input.youtube_video_id ?? existing?.youtube_video_id ?? null,
      official_highlight_url:
        input.official_highlight_url ?? existing?.official_highlight_url ?? null,
      status: input.status ?? existing?.status ?? "pending",
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await getMySqlPool().execute(
      `INSERT INTO match_recaps
        (id, fixture_id, language, summary, key_moments, stats,
         youtube_video_id, official_highlight_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        summary = VALUES(summary),
        key_moments = VALUES(key_moments),
        stats = VALUES(stats),
        youtube_video_id = VALUES(youtube_video_id),
        official_highlight_url = VALUES(official_highlight_url),
        status = VALUES(status)`,
      [
        next.id,
        next.fixture_id,
        next.language,
        next.summary,
        JSON.stringify(next.key_moments),
        JSON.stringify(next.stats),
        next.youtube_video_id,
        next.official_highlight_url,
        next.status,
      ],
    );

    return (await this.find(input.fixture_id, language)) ?? next;
  }
}

export function createMatchRecapStore(path?: string) {
  if (!path && hasMySqlConfig()) return new MySqlMatchRecapStore();
  return new FileMatchRecapStore(path);
}
