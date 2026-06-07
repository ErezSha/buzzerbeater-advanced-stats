import type { StatTotals } from "@/domain/derive-utils";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  readNumber,
  readString,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export interface LeaguePlayerStatTotal {
  playerId: string;
  name: string;
  games: number;
  totals: StatTotals;
}

// Parses teamstats.aspx?mode=totals
// Root: bbapi.teamTotals, stats are in player.totals (not player.stats)
export function parseLeagueTeamStats(
  document: BbapiXmlDocument,
): LeaguePlayerStatTotal[] {
  const teamTotals = childRecord(document.bbapi ?? null, "teamTotals");

  return childRecords(teamTotals, "player").map((player) => {
    const t = childRecord(player, "totals");

    const firstName = readString(player, "firstName") ?? "";
    const lastName = readString(player, "lastName") ?? "";
    const name =
      [firstName, lastName].filter(Boolean).join(" ").trim() ||
      requireString(player, "Unknown player", "name");

    const games = readNumber(t, "games") ?? 0;
    const fgm = readNumber(t, "fgm");
    const fga = readNumber(t, "fga");
    const tpm = readNumber(t, "tpm");
    const tpa = readNumber(t, "tpa");
    const ftm = readNumber(t, "ftm");
    const fta = readNumber(t, "fta");
    const oreb = readNumber(t, "oreb");
    const reb = readNumber(t, "reb");
    // dreb is not in the response; derive it
    const dreb =
      reb !== null && oreb !== null ? reb - oreb : null;

    const totals: StatTotals = {
      minutes: readNumber(t, "minutes"),
      points: readNumber(t, "pts") ?? 0,
      fieldGoals: fgm,
      fieldGoalAttempts: fga,
      twoPointMakes: fgm !== null && tpm !== null ? fgm - tpm : null,
      twoPointAttempts: fga !== null && tpa !== null ? fga - tpa : null,
      threePointMakes: tpm,
      threePointAttempts: tpa,
      freeThrows: ftm,
      freeThrowAttempts: fta,
      offensiveRebounds: oreb,
      defensiveRebounds: dreb,
      totalRebounds: reb,
      assists: readNumber(t, "ast"),
      steals: readNumber(t, "stl"),
      blocks: readNumber(t, "blk"),
      turnovers: readNumber(t, "to"),
      fouls: readNumber(t, "pf"),
    };

    return {
      playerId: requireString(player, "unknown-player", "id", "playerid"),
      name,
      games,
      totals,
    };
  });
}
