# World Cup 2026 Live Analytics — Design

Date: 2026-06-11
Status: Approved by user

## Goal

A live analytics/stats website for the FIFA World Cup 2026 with real-time score updates and multi-language support (EN, ES, FR, AR).

## Decisions (made with user)

| Decision | Choice |
|---|---|
| Data source | football-data.org free tier (~10 req/min); app also runs fully on bundled fixtures via `MOCK_DATA=1` |
| Scope v1 | Live scores + match detail, group standings + bracket, stats leaderboards, historical World Cups |
| Languages | EN, ES, FR, AR (Arabic = RTL) |
| Architecture | Single Next.js full-stack app (App Router, TypeScript, Tailwind) |
| Home layout | "Scoreboard-first": live match cards on top, standings/leaderboard previews below |
| Visual direction | "Tournament festival": vibrant green/blue host-nation gradients, white score cards |
| Deployment | NexusAI, API key as secret |
| Result persistence | Server-side result store; default adapter writes `.data/match-results.json` on persistent NexusAI storage |

## Architecture

One Next.js app with three roles:

1. **UI** — locale-prefixed pages (`/[locale]/...`) via `next-intl`.
2. **API proxy + cache** — server-only fetcher for football-data.org v4; the key never reaches the browser. In-memory TTL cache + rate budgeter staying under 10 req/min. Adaptive poll loop: ~30s while matches are live, several minutes otherwise.
3. **Live fan-out** — SSE endpoint `/api/live` broadcasts diffs from the single poll loop to all connected clients (N viewers cost the same API budget as one). Client falls back to 60s polling if SSE drops.
4. **Result persistence** — completed/live match results are remembered server-side and merged back into feed responses when football-data.org returns delayed or incomplete final scores. The current adapter is file-backed for NexusAI writable storage and can be replaced by a managed NexusAI datastore without changing UI components.
5. **Scheduled sync job** — NexusAI should call `GET /api/jobs/sync-results` or `POST /api/jobs/sync-results` on a schedule. Set `RESULT_SYNC_SECRET` and send it as `Authorization: Bearer <secret>` or `x-sync-secret: <secret>`. This job refreshes the football feed and writes known match results/stats into the result store even when no users are browsing.

Historical World Cups (1930–2022) ship as a static JSON dataset bundled in the repo — zero API calls.

## Components

- `src/lib/football-api.ts` — typed fetcher (server-only), `MOCK_DATA=1` switches to fixtures
- `src/lib/cache.ts` — TTL cache + rate budgeter
- `src/lib/poller.ts` — adaptive poll loop, emits diffs
- `src/lib/live-hub.ts` — SSE client registry / broadcast
- `src/lib/transformers.ts` — API payloads → view models (matches, standings, scorers, bracket)
- `src/data/history.json` — historical tournaments dataset
- `src/i18n/{en,es,fr,ar}.json` — message catalogs; country names via `Intl.DisplayNames`
- Pages under `src/app/[locale]/`: home, matches, matches/[id], groups, bracket, stats, history

## Error handling

API failure or rate-limit → serve last cached data with a "last updated X ago" stamp; never a blank page. Empty states for no-match days and pre-knockout bracket.

## Testing

Vitest unit tests (cache, rate budgeter, transformers) against recorded fixtures; fixture-backed mock mode for development and browser walkthroughs (EN + AR/RTL) without burning API quota.

## Prerequisite

Free API key from football-data.org (user registration). Not a blocker: everything is built and verifiable in mock mode first.
