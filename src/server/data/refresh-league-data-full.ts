import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { parseStandings } from "@/server/bbapi/adapters/standings";
import { parseTeamStats } from "@/server/bbapi/adapters/team-stats";
import { createBbapiClient, type BbapiClient } from "@/server/bbapi/client";
import { isBbapiError } from "@/server/bbapi/errors";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  CACHE_TTLS,
  LEAGUE_FULL_CACHE_KEY,
  RAW_CACHE_KEYS,
  RAW_LEAGUE_CACHE_KEYS,
} from "@/server/cache/cache-keys";
import type { CacheStore } from "@/server/cache/cache-store";
import { getCacheStore } from "@/server/cache/get-cache-store";
import { derivePlayerMetricSummaries } from "@/domain/derive-player-stats";
import type { LeaguePlayerMetricSummary } from "@/domain/types";
import type { LeagueViewModel } from "@/lib/api-types";

export interface RefreshLeagueDataFullOptions {
  client?: BbapiClient;
  cache?: CacheStore;
}

export async function refreshLeagueDataFull(
  options: RefreshLeagueDataFullOptions = {},
): Promise<{ data: LeagueViewModel; refreshedAt: string }> {
  const client = options.client ?? createBbapiClient();
  const cache = options.cache ?? getCacheStore();

  try {
    // standings.aspx without params returns the logged-in user's league
    const standingsDoc = await fetchAndCache(
      client,
      cache,
      "standings.aspx",
      RAW_LEAGUE_CACHE_KEYS.standings,
    );
    const teams = parseStandings(standingsDoc);

    const allPlayers = await Promise.all(
      teams.map(async ({ teamId, teamName }) => {
        const [teamStatsDoc, rosterDoc, scheduleDoc] = await Promise.all([
          fetchAndCache(
            client,
            cache,
            "teamstats.aspx",
            RAW_LEAGUE_CACHE_KEYS.teamStats(teamId),
            { teamid: teamId },
          ),
          fetchAndCache(
            client,
            cache,
            "roster.aspx",
            RAW_LEAGUE_CACHE_KEYS.roster(teamId),
            { teamid: teamId },
          ),
          fetchAndCache(
            client,
            cache,
            "schedule.aspx",
            RAW_LEAGUE_CACHE_KEYS.schedule(teamId),
            { teamid: teamId },
          ),
        ]);

        const players = parseRoster(rosterDoc);
        const playerSeasonStats = parseTeamStats(teamStatsDoc);
        const matches = parseSchedule(scheduleDoc, teamId);
        const boxScores = [];

        for (const match of matches.filter(
          (m) => m.status === "finished" && isLeagueMatch(m.type),
        )) {
          const cacheKey = RAW_CACHE_KEYS.boxScore(match.id);
          let boxScoreDoc = await cache.get<BbapiXmlDocument>(cacheKey);

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
                continue;
              }
              throw error;
            }
          }

          boxScores.push(parseBoxScore(boxScoreDoc, match.id));
        }

        const summaries = derivePlayerMetricSummaries(
          players,
          playerSeasonStats,
          boxScores,
        );

        return summaries.map(
          (p): LeaguePlayerMetricSummary => ({ ...p, teamId, teamName }),
        );
      }),
    );

    const players: LeaguePlayerMetricSummary[] = allPlayers.flat();
    const refreshedAt = new Date().toISOString();
    const viewModel: LeagueViewModel = { players, tier: "full" };

    await cache.set(
      LEAGUE_FULL_CACHE_KEY,
      { data: viewModel, refreshedAt },
      {
        ttlMs: CACHE_TTLS.normalizedLeagueMs,
      },
    );

    return { data: viewModel, refreshedAt };
  } finally {
    await client.logout();
  }
}

function isLeagueMatch(type: string | null | undefined): boolean {
  return type === "league.rs" || type === "league.rs.tv";
}

async function fetchAndCache(
  client: BbapiClient,
  cache: CacheStore,
  endpoint: Parameters<BbapiClient["requestPage"]>[0],
  cacheKey: string,
  params?: Parameters<BbapiClient["requestPage"]>[1],
): Promise<BbapiXmlDocument> {
  const cached = await cache.get<BbapiXmlDocument>(cacheKey);

  if (cached) {
    return cached;
  }

  const doc = await client.requestPage(endpoint, params);
  await cache.set(cacheKey, doc, { ttlMs: CACHE_TTLS.rawPageMs });
  return doc;
}
