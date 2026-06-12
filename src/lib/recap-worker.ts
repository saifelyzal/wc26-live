import type { MatchRecap, MatchRecapStore, RecapKeyMoment } from "./recap-store";
import { createMatchRecapStore } from "./recap-store";
import type { MatchEventVM, MatchVM } from "./transformers";

export type RecapSyncSummary = {
  candidates: number;
  generated: number;
};

const DEFAULT_LANGUAGE = "en";
const BLOCKED_YOUTUBE_IDS = new Set(["ohaVwXIp6TA"]);
const OPENAI_429_COOLDOWN_MS = 60_000;
let openAiRetryAfterUntil = 0;
let lastOpenAiWarningAt = 0;

type YouTubeHighlight = {
  videoId: string;
  url: string;
};

function canReuseReadyRecap(recap: MatchRecap | null) {
  return recap?.status === "ready" && !recap.youtube_video_id;
}

function warnOpenAiOnce(message: string) {
  const now = Date.now();
  if (now - lastOpenAiWarningAt < OPENAI_429_COOLDOWN_MS) return;
  lastOpenAiWarningAt = now;
  console.warn(`[recap-worker] ${message}`);
}

function retryAfterMs(response: Response) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return OPENAI_429_COOLDOWN_MS;
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(seconds * 1000, OPENAI_429_COOLDOWN_MS);
  const dateMs = Date.parse(retryAfter);
  if (Number.isFinite(dateMs)) return Math.max(dateMs - Date.now(), OPENAI_429_COOLDOWN_MS);
  return OPENAI_429_COOLDOWN_MS;
}

function eventText(match: MatchVM, event: MatchEventVM): string {
  const side =
    event.teamId === match.home.id
      ? match.home.name
      : event.teamId === match.away.id
        ? match.away.name
        : "Unknown team";
  if (event.type === "goal") return `${side}: ${event.player} scored.`;
  if (event.type === "penalty") return `${side}: ${event.player} scored a penalty.`;
  if (event.type === "own-goal") return `${side}: own goal by ${event.player}.`;
  if (event.type === "yellow") return `${side}: ${event.player} was booked.`;
  return `${side}: ${event.player} was sent off.`;
}

function recapStats(match: MatchVM) {
  if (!match.score) return match.stats;
  return {
    ...match.stats,
    home: {
      ...match.stats.home,
      goals: Math.max(match.stats.home.goals, match.score.home),
    },
    away: {
      ...match.stats.away,
      goals: Math.max(match.stats.away.goals, match.score.away),
    },
  };
}

export function buildKeyMoments(match: MatchVM): RecapKeyMoment[] {
  const moments: RecapKeyMoment[] = match.events.map((event) => ({
    minute: event.minute,
    text: eventText(match, event),
  }));

  if (match.score) {
    moments.push({
      minute: null,
      text: `Full time: ${match.home.name} ${match.score.home}-${match.score.away} ${match.away.name}.`,
    });
  }

  return moments;
}

export function fallbackSummary(match: MatchVM): string {
  const score = match.score
    ? `${match.home.name} ${match.score.home}-${match.score.away} ${match.away.name}`
    : `${match.home.name} vs ${match.away.name}`;
  const goals = match.score
    ? match.score.home + match.score.away
    : match.stats.home.goals + match.stats.away.goals;
  const cards = match.stats.home.totalCards + match.stats.away.totalCards;
  const cardsText = cards > 0 ? ` The referee issued ${cards} card${cards === 1 ? "" : "s"}.` : "";
  return `${score} finished in the ${match.group ? `Group ${match.group}` : match.stage}. The match produced ${goals} goal${goals === 1 ? "" : "s"}.${cardsText}`;
}

function extractOutputText(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const maybe = json as { output_text?: unknown; output?: unknown };
  if (typeof maybe.output_text === "string") return maybe.output_text.trim();
  if (!Array.isArray(maybe.output)) return null;

  const parts: string[] = [];
  for (const item of maybe.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("\n").trim() || null;
}

function extractYouTubeVideoIds(json: unknown): string[] {
  if (!json || typeof json !== "object") return [];
  const items = (json as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const ids: string[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    if (!id || typeof id !== "object") continue;
    const videoId = (id as { videoId?: unknown }).videoId;
    if (typeof videoId === "string" && videoId.length > 0) ids.push(videoId);
  }
  return ids;
}

async function isEmbeddableVideo(videoId: string): Promise<boolean> {
  if (BLOCKED_YOUTUBE_IDS.has(videoId)) return false;
  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}`,
  );
  return response.ok;
}

async function findYouTubeHighlight(match: MatchVM): Promise<YouTubeHighlight | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const score = match.score ? `${match.score.home}-${match.score.away}` : "";
  const query = [
    "FIFA",
    match.home.name,
    match.away.name,
    score,
    "highlights",
    "World Cup 2026",
  ]
    .filter(Boolean)
    .join(" ");

  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoEmbeddable: "true",
    maxResults: "5",
    order: "relevance",
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
  );
  if (!response.ok) throw new Error(`YouTube responded ${response.status}`);
  for (const videoId of extractYouTubeVideoIds(await response.json())) {
    if (await isEmbeddableVideo(videoId)) {
      return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
    }
  }
  return null;
}

async function generateAISummary(match: MatchVM, keyMoments: RecapKeyMoment[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (Date.now() < openAiRetryAfterUntil) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RECAP_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "Write concise football match recaps for a live World Cup dashboard. Stay factual and only use provided data.",
        },
        {
          role: "user",
          content: JSON.stringify({
            match: {
              home: match.home.name,
              away: match.away.name,
              score: match.score,
              group: match.group,
              stage: match.stage,
            },
            keyMoments,
            stats: match.stats,
          }),
        },
      ],
      max_output_tokens: 180,
    }),
  });

  if (response.status === 429) {
    openAiRetryAfterUntil = Date.now() + retryAfterMs(response);
    warnOpenAiOnce("OpenAI recap skipped: rate limited by OpenAI (429). Using fallback summary.");
    return null;
  }
  if (!response.ok) {
    warnOpenAiOnce(`OpenAI recap skipped: OpenAI responded ${response.status}. Using fallback summary.`);
    return null;
  }
  return extractOutputText(await response.json());
}

export async function generateMatchRecap(
  match: MatchVM,
  {
    language = DEFAULT_LANGUAGE,
    store = createMatchRecapStore(),
  }: {
    language?: string;
    store?: MatchRecapStore;
  } = {},
): Promise<MatchRecap> {
  const keyMoments = buildKeyMoments(match);
  let summary = fallbackSummary(match);
  let status: MatchRecap["status"] = "ready";
  let officialHighlightUrl: string | null = null;

  try {
    summary = (await generateAISummary(match, keyMoments)) ?? summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnOpenAiOnce(`OpenAI recap unavailable: ${message}. Using fallback summary.`);
    status = "ready";
  }

  try {
    officialHighlightUrl = (await findYouTubeHighlight(match))?.url ?? null;
  } catch (error) {
    console.error("[recap-worker] YouTube highlight lookup unavailable:", error);
  }

  return await store.upsert({
    fixture_id: String(match.id),
    language,
    summary,
    key_moments: keyMoments,
    stats: recapStats(match),
    youtube_video_id: null,
    official_highlight_url: officialHighlightUrl,
    status,
  });
}

export async function getOrGenerateMatchRecap(
  match: MatchVM,
  {
    language = DEFAULT_LANGUAGE,
    store = createMatchRecapStore(),
  }: {
    language?: string;
    store?: MatchRecapStore;
  } = {},
): Promise<MatchRecap | null> {
  const existing = await store.find(String(match.id), language);
  if (canReuseReadyRecap(existing)) return existing;
  if (match.status !== "FINISHED") return existing;
  return await generateMatchRecap(match, { language, store });
}

export async function syncMatchRecaps(
  matches: MatchVM[],
  {
    language = DEFAULT_LANGUAGE,
    store = createMatchRecapStore(),
  }: {
    language?: string;
    store?: MatchRecapStore;
  } = {},
): Promise<RecapSyncSummary> {
  const candidates = matches.filter((match) => match.status === "FINISHED");
  let generated = 0;

  for (const match of candidates) {
    const existing = await store.find(String(match.id), language);
    if (canReuseReadyRecap(existing)) continue;
    await generateMatchRecap(match, { language, store });
    generated += 1;
  }

  return { candidates: candidates.length, generated };
}
