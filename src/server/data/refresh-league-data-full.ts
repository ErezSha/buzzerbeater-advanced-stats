import { parseBoxScore } from "@/server/bbapi/adapters/box-score";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseSchedule } from "@/server/bbapi/adapters/schedule";
import { parseStandings } from "@/server/bbapi/adapters/standings";
import { parseTeamInfo } from "@/server/bbapi/adapters/team-info";
import { parseTeamStats } from "@/server/bbapi/adapters/team-stats";
import { createBbapiClient, type BbapiClient } from "@/server/bbapi/client";
import { isBbapiError } from "@/server/bbapi/errors";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  CACHE_TTLS,
  LEAGUE_FULL_CACHE_KEY,
  RAW_CACHE_KEYS,
  RAW_LEAGUE_CACHE_KEYS,
  leagueDataTtlMs,
} from "@/server/cache/cache-keys";
import type { CacheStore } from "@/server/cache/cache-store";
import { getCacheStore } from "@/server/cache/get-cache-store";
import { derivePlayerMetricSummaries } from "@/domain/derive-player-stats";
import type { BoxScore, LeaguePlayerMetricSummary } from "@/domain/types";
import type {
  LeagueIncompleteTeam,
  LeagueSegmentedPlayers,
  LeagueViewModel,
} from "@/lib/api-types";

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
    // standings.aspx without params returns the logged-in user's league, and
    // teaminfo.aspx returns the logged-in user's own team — used to highlight
    // their players among the league-wide rows.
    const [standingsDoc, teamInfoDoc] = await Promise.all([
      fetchAndCache(
        client,
        cache,
        "standings.aspx",
        RAW_LEAGUE_CACHE_KEYS.standings,
      ),
      fetchAndCache(client, cache, "teaminfo.aspx", RAW_CACHE_KEYS.teamInfo),
    ]);
    const teams = parseStandings(standingsDoc);
    const ownTeamId = parseTeamInfo(teamInfoDoc).id;

    const teamSegments = await Promise.all(
      teams.map(async ({ teamId, teamName }) => {
        const [teamStats, rosterDoc, scheduleDoc] = await Promise.all([
          fetchTeamStatsResilient(client, cache, teamId, { teamid: teamId }),
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
        const playerSeasonStats = teamStats.doc
          ? parseTeamStats(teamStats.doc)
          : [];
        const matches = parseSchedule(scheduleDoc, teamId);

        // Partition finished league box scores by segment so we can derive
        // regular / playoff / combined summaries separately.
        const regularBoxScores: BoxScore[] = [];
        const playoffBoxScores: BoxScore[] = [];

        for (const match of matches) {
          if (match.status !== "finished") continue;
          const segment = classifyLeagueMatch(match.type);
          if (!segment) continue;

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
                (error.code === "BoxscoreNotAvailable" ||
                  error.code === "MatchInProgress")
              ) {
                continue;
              }
              throw error;
            }
          }

          const boxScore = parseBoxScore(boxScoreDoc, match.id);
          if (segment === "regular") {
            regularBoxScores.push(boxScore);
          } else {
            playoffBoxScores.push(boxScore);
          }
        }

        const withTeam = (
          summaries: ReturnType<typeof derivePlayerMetricSummaries>,
        ): LeaguePlayerMetricSummary[] =>
          summaries.map((p) => ({ ...p, teamId, teamName }));

        // seasonStat (teamstats.aspx) is regular-season-only, so it is passed
        // only to the regular segment. Playoff and All derive from box scores
        // alone with an empty season-stat list (yielding seasonStat: null).
        return {
          teamId,
          teamName,
          inProgress: teamStats.inProgress,
          regular: withTeam(
            derivePlayerMetricSummaries(
              players,
              playerSeasonStats,
              regularBoxScores,
            ),
          ),
          playoff: withTeam(
            derivePlayerMetricSummaries(players, [], playoffBoxScores),
          ),
          all: withTeam(
            derivePlayerMetricSummaries(players, [], [
              ...regularBoxScores,
              ...playoffBoxScores,
            ]),
          ),
        };
      }),
    );

    const incompleteTeams: LeagueIncompleteTeam[] = teamSegments
      .filter((s) => s.inProgress)
      .map(({ teamId, teamName }) => ({ teamId, teamName }));

    const players: LeagueSegmentedPlayers = {
      all: teamSegments.flatMap((s) => s.all),
      regular: teamSegments.flatMap((s) => s.regular),
      playoff: teamSegments.flatMap((s) => s.playoff),
    };
    const refreshedAt = new Date().toISOString();
    const viewModel: LeagueViewModel = {
      players,
      tier: "full",
      ownTeamId,
      ...(incompleteTeams.length > 0 ? { incompleteTeams } : {}),
    };

    await cache.set(
      LEAGUE_FULL_CACHE_KEY,
      { data: viewModel, refreshedAt },
      {
        ttlMs: leagueDataTtlMs(),
      },
    );

    return { data: viewModel, refreshedAt };
  } finally {
    await client.logout();
  }
}

type LeagueSegmentKind = "regular" | "playoff";

// Classifies a schedule match type into the segment it belongs to, or null if
// it should be excluded from league stats (friendly, cup, bbm, all-star, etc.).
function classifyLeagueMatch(
  type: string | null | undefined,
): LeagueSegmentKind | null {
  if (type === "league.rs" || type === "league.rs.tv") return "regular";
  if (
    type === "league.quarterfinal" ||
    type === "league.semifinal" ||
    type === "league.final"
  ) {
    return "playoff";
  }
  return null;
}

/**
 * teamstats.aspx is locked by BuzzerBeater while a team has a match being
 * simulated, returning a `MatchInProgress` error. Rather than failing the whole
 * league refresh, swallow that one error and report the team as incomplete. In
 * the full tier season stats only feed the (currently unrendered) seasonStat
 * field, so box-score-derived metrics for the team are unaffected.
 */
async function fetchTeamStatsResilient(
  client: BbapiClient,
  cache: CacheStore,
  teamId: string,
  params: Parameters<BbapiClient["requestPage"]>[1],
): Promise<{ doc: BbapiXmlDocument | null; inProgress: boolean }> {
  try {
    const doc = await fetchAndCache(
      client,
      cache,
      "teamstats.aspx",
      RAW_LEAGUE_CACHE_KEYS.teamStats(teamId),
      params,
    );
    return { doc, inProgress: false };
  } catch (error) {
    if (isBbapiError(error) && error.code === "MatchInProgress") {
      return { doc: null, inProgress: true };
    }
    throw error;
  }
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
