import { NextResponse } from "next/server";
import type {
  OpponentApiResponse,
  OpponentGameLog,
  OpponentPlayerSummary,
} from "@/lib/api-types";
import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { createBbapiClient } from "@/server/bbapi/client";
import { isBbapiError } from "@/server/bbapi/errors";
import { toApiError } from "@/server/data/api-errors";
import { usageRate } from "@/domain/metrics";
import { totalsFromTeamStat } from "@/domain/derive-utils";
import type { BoxScore, Match, PlayerGameStat, TeamGameStat } from "@/domain/types";
import { CACHE_TTLS, RAW_CACHE_KEYS } from "@/server/cache/cache-keys";
import { getCacheStore } from "@/server/cache/get-cache-store";
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

export async function GET(
  _request: Request,
  context: OpponentRouteContext,
): Promise<NextResponse<OpponentApiResponse>> {
  try {
    const { teamId } = await context.params;
    const cache = getCacheStore();
    const client = createBbapiClient();

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
              error.code === "BoxscoreNotAvailable"
            ) {
              games.push(buildEmptyGameLog(match));
              continue;
            }
            throw error;
          }
        }

        const boxScore = parseBoxScore(boxScoreDoc, match.id);
        games.push(buildGameLog(match, boxScore, teamId));
      }

      return NextResponse.json({ ok: true, data: { teamId, games } });
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
