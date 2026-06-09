export const DASHBOARD_CACHE_KEY = "normalized/dashboard";
export const LEAGUE_CACHE_KEY = "normalized/league";
export const LEAGUE_FULL_CACHE_KEY = "normalized/league/full";

export const RAW_CACHE_KEYS = Object.freeze({
  teamInfo: "raw/teaminfo",
  roster: "raw/roster",
  schedule: "raw/schedule",
  teamStats: "raw/teamstats",
  boxScore: (matchId: string) => `raw/boxscore/${matchId}`,
});

export const RAW_LEAGUE_CACHE_KEYS = Object.freeze({
  standings: "raw/league/standings",
  roster: (teamId: string) => `raw/league/roster/${teamId}`,
  // per-game breakdown (full tier, no mode param)
  teamStats: (teamId: string) => `raw/league/teamstats/${teamId}`,
  // aggregated season totals (lightweight tier, mode=totals)
  teamStatsTotals: (teamId: string) => `raw/league/teamstats/totals/${teamId}`,
  schedule: (teamId: string) => `raw/league/schedule/${teamId}`,
});

export const PLAYER_ANALYSIS_CACHE_KEY = (playerId: string) =>
  `player/analysis/${playerId}`;

export const CACHE_TTLS = Object.freeze({
  normalizedDashboardMs: 15 * 60 * 1000,
  rawPageMs: 15 * 60 * 1000,
  finishedBoxScoreMs: 30 * 24 * 60 * 60 * 1000, // box scores are immutable once a game ends
});

// BB games tip off at 17:55 local time. Both the player-analysis and league
// caches follow the same game-aware shape: while stats are still finalizing
// after kickoff, use a short TTL; otherwise cache until just before the next
// game (no point refetching when no new games have been played).
const GAME_HOUR = 17;
const GAME_MINUTE = 55;
const POST_GAME_TTL_MS = 20 * 60 * 1000;
const PRE_GAME_BUFFER_MS = 5 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;

// JS day-of-week: 0=Sun … 6=Sat.
// Player analysis covers any league level, so it uses the broad set of possible
// game days. The league view aggregates a single league that plays Tue & Sat,
// so its cache can live in one stretch from Tue night until Sat evening.
const ALL_GAME_DAYS = new Set([2, 3, 4, 6]);
const LEAGUE_GAME_DAYS = new Set([2, 6]);

// Hours after kickoff during which box scores are still settling (short TTL).
const PLAYER_POST_GAME_HOURS = 2;
const LEAGUE_POST_GAME_HOURS = 3;

function inPostGameWindow(
  now: Date,
  gameDays: Set<number>,
  windowHours: number,
): boolean {
  if (!gameDays.has(now.getDay())) return false;
  const kickoff = new Date(now);
  kickoff.setHours(GAME_HOUR, GAME_MINUTE, 0, 0);
  const sinceKickoffMs = now.getTime() - kickoff.getTime();
  return sinceKickoffMs >= 0 && sinceKickoffMs < windowHours * 60 * 60 * 1000;
}

function msUntilNextGame(now: Date, gameDays: Set<number>): number {
  for (let d = 0; d <= 7; d++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + d);
    candidate.setHours(GAME_HOUR, GAME_MINUTE, 0, 0);
    if (
      gameDays.has(candidate.getDay()) &&
      candidate.getTime() > now.getTime()
    ) {
      return candidate.getTime() - now.getTime() - PRE_GAME_BUFFER_MS;
    }
  }

  return MAX_TTL_MS;
}

function gameAwareTtlMs(
  now: Date,
  gameDays: Set<number>,
  postGameHours: number,
): number {
  if (inPostGameWindow(now, gameDays, postGameHours)) {
    return POST_GAME_TTL_MS;
  }
  return msUntilNextGame(now, gameDays);
}

export function playerAnalysisTtlMs(now: Date = new Date()): number {
  return gameAwareTtlMs(now, ALL_GAME_DAYS, PLAYER_POST_GAME_HOURS);
}

export function leagueDataTtlMs(now: Date = new Date()): number {
  return gameAwareTtlMs(now, LEAGUE_GAME_DAYS, LEAGUE_POST_GAME_HOURS);
}
