import type { NormalizedBbapiData } from "@/domain/types";
import { deriveDashboardMetrics } from "@/domain/aggregate";
import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { parseTeamInfo } from "@/server/bbapi/adapters/team-info";
import { parseTeamStats } from "@/server/bbapi/adapters/team-stats";
import { createBbapiClient, type BbapiClient } from "@/server/bbapi/client";
import { isBbapiError } from "@/server/bbapi/errors";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  CACHE_TTLS,
  DASHBOARD_CACHE_KEY,
  RAW_CACHE_KEYS,
} from "@/server/cache/cache-keys";
import type { CacheStore } from "@/server/cache/cache-store";
import { getCacheStore } from "@/server/cache/get-cache-store";

export interface RefreshDashboardDataOptions {
  client?: BbapiClient;
  cache?: CacheStore;
}

export async function refreshDashboardData(
  options: RefreshDashboardDataOptions = {},
): Promise<NormalizedBbapiData> {
  const client = options.client ?? createBbapiClient();
  const cache = options.cache ?? getCacheStore();

  try {
    const teamInfoDocument = await requestAndCache(
      client,
      cache,
      "teaminfo.aspx",
      RAW_CACHE_KEYS.teamInfo,
    );
    const team = parseTeamInfo(teamInfoDocument);

    const [rosterDocument, scheduleDocument, teamStatsDocument] =
      await Promise.all([
        requestAndCache(client, cache, "roster.aspx", RAW_CACHE_KEYS.roster),
        requestAndCache(
          client,
          cache,
          "schedule.aspx",
          RAW_CACHE_KEYS.schedule,
        ),
        requestAndCache(
          client,
          cache,
          "teamstats.aspx",
          RAW_CACHE_KEYS.teamStats,
        ),
      ]);

    const players = parseRoster(rosterDocument);
    const matches = parseSchedule(scheduleDocument, team.id);
    const playerSeasonStats = parseTeamStats(teamStatsDocument);
    const boxScores = [];

    for (const match of matches.filter(
      (candidate) =>
        candidate.status === "finished" && isStatMatch(candidate.type),
    )) {
      try {
        const boxScoreDocument = await requestAndCache(
          client,
          cache,
          "boxscore.aspx",
          RAW_CACHE_KEYS.boxScore(match.id),
          { matchid: match.id },
          CACHE_TTLS.finishedBoxScoreMs,
        );

        boxScores.push(parseBoxScore(boxScoreDocument, match.id));
      } catch (error) {
        if (!isBbapiError(error) || error.code !== "BoxscoreNotAvailable") {
          throw error;
        }
      }
    }

    const baseData: Omit<NormalizedBbapiData, "derived"> = {
      team,
      players,
      matches,
      playerSeasonStats,
      boxScores,
      refreshedAt: new Date().toISOString(),
    };
    const data: NormalizedBbapiData = {
      ...baseData,
      derived: deriveDashboardMetrics(baseData),
    };

    await cache.set(DASHBOARD_CACHE_KEY, data, {
      ttlMs: CACHE_TTLS.normalizedDashboardMs,
    });

    return data;
  } finally {
    await client.logout();
  }
}

/**
 * Returns true for official competitive matches that should be included in
 * stats (league, cup, bbm). Excludes scrimmages ("friendly") and private
 * league matches (type starts with "pl.").
 */
function isStatMatch(type: string | null | undefined): boolean {
  if (!type) return true;
  return type !== "friendly" && !type.startsWith("pl.");
}

async function requestAndCache(
  client: BbapiClient,
  cache: CacheStore,
  endpoint: Parameters<BbapiClient["requestPage"]>[0],
  cacheKey: string,
  params?: Parameters<BbapiClient["requestPage"]>[1],
  ttlMs = CACHE_TTLS.rawPageMs,
): Promise<BbapiXmlDocument> {
  const document = await client.requestPage(endpoint, params);
  await cache.set(cacheKey, document, { ttlMs });
  return document;
}
