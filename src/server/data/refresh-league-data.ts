import { parseLeagueTeamStats } from "@/server/bbapi/adapters/league-team-stats";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseStandings } from "@/server/bbapi/adapters/standings";
import { createBbapiClient, type BbapiClient } from "@/server/bbapi/client";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  CACHE_TTLS,
  LEAGUE_CACHE_KEY,
  RAW_LEAGUE_CACHE_KEYS,
} from "@/server/cache/cache-keys";
import type { CacheStore } from "@/server/cache/cache-store";
import { getCacheStore } from "@/server/cache/get-cache-store";
import { deriveLeaguePlayerMetricSummaries } from "@/server/data/derive-league-player-stats";
import type { LeaguePlayerMetricSummary } from "@/domain/types";
import type { LeagueViewModel } from "@/lib/api-types";

export interface RefreshLeagueDataOptions {
  client?: BbapiClient;
  cache?: CacheStore;
}

export async function refreshLeagueData(
  options: RefreshLeagueDataOptions = {},
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

    // Phase 1: fetch all teams' data in parallel
    const teamData = await Promise.all(
      teams.map(async ({ teamId, teamName }) => {
        const [teamStatsDoc, rosterDoc] = await Promise.all([
          fetchAndCache(
            client,
            cache,
            "teamstats.aspx",
            RAW_LEAGUE_CACHE_KEYS.teamStats(teamId),
            { teamid: teamId, mode: "totals" },
          ),
          fetchAndCache(
            client,
            cache,
            "roster.aspx",
            RAW_LEAGUE_CACHE_KEYS.roster(teamId),
            { teamid: teamId },
          ),
        ]);

        return {
          teamId,
          teamName,
          playerTotals: parseLeagueTeamStats(teamStatsDoc),
          roster: parseRoster(rosterDoc),
        };
      }),
    );

    // Phase 2: compute league total rebounds so we can estimate opponent rebounds
    // per team. TRB% formula = player_reb / (team_reb + opp_reb). Since the
    // schedule is a balanced round-robin, each team's opponents have, on average,
    // (league_total_reb - team_reb) / (n_teams - 1) total rebounds.
    const leagueTotalReb = teamData.reduce((sum, { playerTotals }) => {
      const teamReb = playerTotals.reduce(
        (s, p) => s + (p.totals.totalRebounds ?? 0),
        0,
      );
      return sum + teamReb;
    }, 0);
    const numTeams = teamData.length;

    // Phase 3: derive per-player metrics now that we have the league total
    const allPlayers: LeaguePlayerMetricSummary[] = teamData.flatMap(
      ({ teamId, teamName, playerTotals, roster }) => {
        const teamReb = playerTotals.reduce(
          (s, p) => s + (p.totals.totalRebounds ?? 0),
          0,
        );
        const estimatedOppReb =
          numTeams > 1
            ? (leagueTotalReb - teamReb) / (numTeams - 1)
            : null;

        const positionByPlayer = new Map(
          roster.map((p) => [p.id, p.position ?? null]),
        );

        const derived = deriveLeaguePlayerMetricSummaries(
          playerTotals,
          teamId,
          teamName,
          estimatedOppReb,
        );

        return derived.map((p) => ({
          ...p,
          position: positionByPlayer.get(p.playerId) ?? p.position,
        }));
      },
    );

    const refreshedAt = new Date().toISOString();
    const viewModel: LeagueViewModel = { players: allPlayers, tier: "lightweight" };

    await cache.set(LEAGUE_CACHE_KEY, { data: viewModel, refreshedAt }, {
      ttlMs: CACHE_TTLS.normalizedLeagueMs,
    });

    return { data: viewModel, refreshedAt };
  } finally {
    await client.logout();
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
