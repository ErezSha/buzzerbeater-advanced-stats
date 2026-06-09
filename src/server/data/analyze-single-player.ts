import { derivePlayerMetricSummaries } from "@/domain/derive-player-stats";
import type { SinglePlayerAnalysis } from "@/domain/types";
import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parsePlayerDetail } from "@/server/bbapi/adapters/player";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { parseTeamInfo } from "@/server/bbapi/adapters/team-info";
import { parseTeamStats } from "@/server/bbapi/adapters/team-stats";
import { createBbapiClient, type BbapiClient } from "@/server/bbapi/client";
import { isBbapiError } from "@/server/bbapi/errors";
import type { CacheStore } from "@/server/cache/cache-store";
import { createFileCacheStore } from "@/server/cache/file-cache-store";
import {
  PLAYER_ANALYSIS_CACHE_KEY,
  playerAnalysisTtlMs,
} from "@/server/cache/cache-keys";
import {
  createPlayerSnapshotStore,
  type PlayerSnapshotStore,
} from "@/server/data/player-snapshot-store";

export interface AnalyzeSinglePlayerOptions {
  client?: BbapiClient;
  snapshotStore?: PlayerSnapshotStore;
  cacheStore?: CacheStore;
}

export async function analyzeSinglePlayer(
  playerId: string,
  options: AnalyzeSinglePlayerOptions = {},
): Promise<SinglePlayerAnalysis> {
  const client = options.client ?? createBbapiClient();
  const snapshotStore = options.snapshotStore ?? createPlayerSnapshotStore();
  const cacheStore = options.cacheStore ?? createFileCacheStore();
  const cacheKey = PLAYER_ANALYSIS_CACHE_KEY(playerId);

  const cached = await cacheStore.get<SinglePlayerAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const playerDocument = await client.requestPage("player.aspx", {
      playerid: playerId,
    });

    const player = parsePlayerDetail(playerDocument);
    const ownerTeamId = player.ownerTeamId;

    if (!ownerTeamId) {
      throw new Error(
        "BBAPI player response did not include an owner team id.",
      );
    }

    const [teamInfoDocument, scheduleDocument, teamStatsDocument] =
      await Promise.all([
        client.requestPage("teaminfo.aspx", { teamid: ownerTeamId }),
        client.requestPage("schedule.aspx", { teamid: ownerTeamId }),
        client.requestPage("teamstats.aspx", { teamid: ownerTeamId }),
      ]);

    const ownerTeam = parseTeamInfo(teamInfoDocument);
    const matches = parseSchedule(scheduleDocument, ownerTeam.id);
    const playerSeasonStats = parseTeamStats(teamStatsDocument);
    const boxScores = [];

    for (const match of matches.filter(
      (candidate) =>
        candidate.status === "finished" && isStatMatch(candidate.type),
    )) {
      try {
        const boxScoreDocument = await client.requestPage("boxscore.aspx", {
          matchid: match.id,
        });
        const boxScore = parseBoxScore(boxScoreDocument, match.id);

        if (boxScore.players.some((stat) => stat.playerId === player.id)) {
          boxScores.push(boxScore);
        }
      } catch (error) {
        if (
          !isBbapiError(error) ||
          (error.code !== "BoxscoreNotAvailable" &&
            error.code !== "MatchInProgress")
        ) {
          throw error;
        }
      }
    }

    const [summary] = derivePlayerMetricSummaries(
      [player],
      playerSeasonStats,
      boxScores,
    );
    const previousSnapshot = await snapshotStore.readLatest(player.id);
    const refreshedAt = new Date().toISOString();

    await snapshotStore.append(player.id, {
      savedAt: refreshedAt,
      player,
      ownerTeam,
      summary,
    });

    const result: SinglePlayerAnalysis = {
      player,
      ownerTeam,
      summary,
      finishedMatchCount: matches.filter(
        (candidate) =>
          candidate.status === "finished" && isStatMatch(candidate.type),
      ).length,
      boxScoreCount: boxScores.length,
      refreshedAt,
      previousSnapshot,
    };

    await cacheStore.set(cacheKey, result, { ttlMs: playerAnalysisTtlMs() });

    return result;
  } finally {
    await client.logout();
  }
}

function isStatMatch(type: string | null | undefined): boolean {
  if (!type) return true;
  return type !== "friendly" && !type.startsWith("pl.");
}
