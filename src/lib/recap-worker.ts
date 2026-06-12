import type { MatchRecap, MatchRecapStore, RecapKeyMoment } from "./recap-store";
import { createMatchRecapStore } from "./recap-store";
import type { MatchEventVM, MatchVM } from "./transformers";

export type RecapSyncSummary = {
  candidates: number;
  generated: number;
};

const DEFAULT_LANGUAGE = "en";

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

async function generateAISummary(match: MatchVM, keyMoments: RecapKeyMoment[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

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

  if (!response.ok) throw new Error(`OpenAI responded ${response.status}`);
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

  try {
    summary = (await generateAISummary(match, keyMoments)) ?? summary;
  } catch (error) {
    console.error("[recap-worker] OpenAI recap unavailable:", error);
    status = "ready";
  }

  return await store.upsert({
    fixture_id: String(match.id),
    language,
    summary,
    key_moments: keyMoments,
    stats: recapStats(match),
    status,
  });
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
    if (existing?.status === "ready") continue;
    await generateMatchRecap(match, { language, store });
    generated += 1;
  }

  return { candidates: candidates.length, generated };
}
