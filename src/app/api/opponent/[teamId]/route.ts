import { NextResponse } from "next/server";
import type {
  OpponentApiResponse,
  OpponentGameLog,
  OpponentPlayerSummary,
} from "@/lib/api-types";
import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { isBbapiError } from "@/server/bbapi/errors";
import { toApiError } from "@/server/data/api-errors";
import { getRequestContext } from "@/server/data/request-context";
import { deriveAvailability } from "@/domain/derive-availability";
import {
  deriveTeamGameMetrics,
  deriveTeamSeasonMetrics,
} from "@/domain/derive-team-stats";
import { usageRate } from "@/domain/metrics";
import { totalsFromTeamStat } from "@/domain/derive-utils";
import type {
  AvailabilitySummary,
  BoxScore,
  Match,
  PlayerGameStat,
  TeamGameStat,
  TeamSeasonMetrics,
} from "@/domain/types";
import {
  CACHE_TTLS,
  RAW_CACHE_KEYS,
  RAW_LEAGUE_CACHE_KEYS,
} from "@/server/cache/cache-keys";
import type { BbapiClient } from "@/server/bbapi/client";
import type { CacheStore } from "@/server/cache/cache-store";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OpponentRouteContext {
  params: Promise<{ teamId: string }>;
}

/** Exclude friendly/scrimmage and private-league matches. */
function isCompetitiveMatch(type: string | null | undefined): boolean {
  if (!type) return true;
  const t = type.toLowerCase();
  return t !== "friendly" && !t.startsWith("pl.");
}

function playerSummary(
  p: PlayerGameStat,
  usageRateValue: number | null = null,
): OpponentPlayerSummary {
  return {
    name: p.playerName ?? "Unknown",
    position: p.mostPlayedPosition ?? null,
    points: p.points ?? null,
    usageRate: usageRateValue,
  };
}

function findTopScorer(players: PlayerGameStat[]): OpponentPlayerSummary | null {
  if (players.length === 0) return null;
  const best = players.reduce<PlayerGameStat | null>((acc, p) => {
    if (acc === null) return p;
    return (p.points ?? -1) > (acc.points ?? -1) ? p : acc;
  }, null);
  return best ? playerSummary(best) : null;
}

function findTopUsage(
  players: PlayerGameStat[],
  teamStat: TeamGameStat | null,
): OpponentPlayerSummary | null {
  if (players.length === 0) return null;
  const teamTotals = totalsFromTeamStat(teamStat);
  const teamMinutes = players.reduce<number | null>((sum, p) => {
    if (sum === null || p.minutes == null) return null;
    return sum + p.minutes;
  }, 0);

  let bestPlayer: PlayerGameStat | null = null;
  let bestRate: number | null = null;

  for (const p of players) {
    const rate = usageRate(
      p.fieldGoalAttempts,
      p.freeThrowAttempts,
      p.turnovers,
      teamTotals.fieldGoalAttempts,
      teamTotals.freeThrowAttempts,
      teamTotals.turnovers,
      p.minutes,
      teamMinutes,
    );
    if (rate !== null && (bestRate === null || rate > bestRate)) {
      bestRate = rate;
      bestPlayer = p;
    }
  }

  return bestPlayer ? playerSummary(bestPlayer, bestRate) : null;
}

function buildGameLog(
  match: Match,
  boxScore: BoxScore,
  opponentTeamId: string,
): OpponentGameLog {
  const teamStat =
    boxScore.homeTeam?.teamId === opponentTeamId
      ? boxScore.homeTeam
      : boxScore.awayTeam?.teamId === opponentTeamId
        ? boxScore.awayTeam
        : null;

  const otherStat =
    teamStat === boxScore.homeTeam ? boxScore.awayTeam : boxScore.homeTeam;

  const opponentPlayers = boxScore.players.filter(
    (p) => p.teamId === opponentTeamId,
  );

  const teamScore = teamStat?.points ?? null;
  const vsScore = otherStat?.points ?? null;
  const margin =
    teamScore !== null && vsScore !== null ? teamScore - vsScore : null;

  return {
    matchId: match.id,
    date: match.date,
    vsName: match.opponentName ?? null,
    teamScore,
    vsScore,
    margin,
    offStrategy: teamStat?.offStrategy ?? null,
    defStrategy: teamStat?.defStrategy ?? null,
    effort: teamStat?.effort ?? null,
    topScorer: findTopScorer(opponentPlayers),
    topUsage: findTopUsage(opponentPlayers, teamStat ?? null),
  };
}

function buildEmptyGameLog(match: Match): OpponentGameLog {
  return {
    matchId: match.id,
    date: match.date,
    vsName: match.opponentName ?? null,
    teamScore: null,
    vsScore: null,
    margin: null,
    offStrategy: null,
    defStrategy: null,
    effort: null,
    topScorer: null,
    topUsage: null,
  };
}

/** Recent minutes per game by player across the opponent's fetched box scores. */
function minutesPerGameByPlayer(
  boxScores: BoxScore[],
  teamId: string,
): Map<string, number> {
  const totalMinutes = new Map<string, number>();
  const games = new Map<string, number>();
  for (const boxScore of boxScores) {
    for (const player of boxScore.players) {
      if (player.teamId !== teamId) continue;
      totalMinutes.set(
        player.playerId,
        (totalMinutes.get(player.playerId) ?? 0) + (player.minutes ?? 0),
      );
      games.set(player.playerId, (games.get(player.playerId) ?? 0) + 1);
    }
  }
  return new Map(
    Array.from(totalMinutes.entries()).map(([playerId, minutes]) => [
      playerId,
      minutes / (games.get(playerId) ?? 1),
    ]),
  );
}

/**
 * Fetch + parse the opponent's roster (one cached `roster.aspx?teamid` call) and
 * fold injury / game-shape into an availability summary. Degrades to null on any
 * failure — scouting must still work if the roster can't be loaded.
 */
async function loadOpponentAvailability(
  client: BbapiClient,
  cache: CacheStore,
  teamId: string,
  boxScores: BoxScore[],
): Promise<AvailabilitySummary | null> {
  try {
    const cacheKey = RAW_LEAGUE_CACHE_KEYS.roster(teamId);
    let rosterDoc = await cache.get<BbapiXmlDocument>(cacheKey);
    if (!rosterDoc) {
      rosterDoc = await client.requestPage("roster.aspx", { teamid: teamId });
      await cache.set(cacheKey, rosterDoc, { ttlMs: CACHE_TTLS.rawPageMs });
    }

    const roster = parseRoster(rosterDoc);
    return deriveAvailability(roster, minutesPerGameByPlayer(boxScores, teamId));
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  context: OpponentRouteContext,
): Promise<NextResponse<OpponentApiResponse>> {
  try {
    const { teamId } = await context.params;
    const { cache, client } = await getRequestContext();

    try {
      // Fetch the opponent's schedule (as if they are the "own" team)
      const scheduleDoc = await client.requestPage("schedule.aspx", {
        teamid: teamId,
      });
      const matches = parseSchedule(scheduleDoc, teamId);

      // Take their last 5 competitive finished matches
      const recentMatches = matches
        .filter(
          (m) => m.status === "finished" && isCompetitiveMatch(m.type),
        )
        .slice(-5);

      const games: OpponentGameLog[] = [];
      const boxScores: BoxScore[] = [];
      const playedMatches: Match[] = [];

      for (const match of recentMatches) {
        const cacheKey = RAW_CACHE_KEYS.boxScore(match.id);
        let boxScoreDoc: BbapiXmlDocument | null = await cache.get<BbapiXmlDocument>(cacheKey);

        if (!boxScoreDoc) {
          try {
            boxScoreDoc = await client.requestPage("boxscore.aspx", {
              matchid: match.id,
            });
            await cache.set(cacheKey, boxScoreDoc, {
              ttlMs: CACHE_TTLS.finishedBoxScoreMs,
            });
          } catch (error) {
            if (
              isBbapiError(error) &&
              (error.code === "BoxscoreNotAvailable" ||
                error.code === "MatchInProgress")
            ) {
              games.push(buildEmptyGameLog(match));
              continue;
            }
            throw error;
          }
        }

        const boxScore = parseBoxScore(boxScoreDoc, match.id);
        games.push(buildGameLog(match, boxScore, teamId));
        boxScores.push(boxScore);
        playedMatches.push(match);
      }

      // Efficiency from the opponent's recent box scores (their perspective).
      const teamGames = deriveTeamGameMetrics(
        { id: teamId, name: "" },
        playedMatches,
        boxScores,
      );
      const efficiency: TeamSeasonMetrics | null =
        teamGames.length > 0 ? deriveTeamSeasonMetrics(teamGames) : null;

      const availability = await loadOpponentAvailability(
        client,
        cache,
        teamId,
        boxScores,
      );

      return NextResponse.json({
        ok: true,
        data: { teamId, games, efficiency, availability },
      });
    } finally {
      await client.logout();
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: toApiError(error) },
      { status: 500 },
    );
  }
}
