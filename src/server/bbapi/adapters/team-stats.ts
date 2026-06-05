import type { PlayerSeasonStat } from "@/domain/types";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  readNumber,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export function parseTeamStats(document: BbapiXmlDocument): PlayerSeasonStat[] {
  const teamStats = childRecord(document.bbapi ?? null, "teamStats");

  return childRecords(teamStats, "player").map((player) => ({
    playerId: requireString(player, "unknown-player", "id", "playerid"),
    games: readNumber(player, "games"),
    minutesPerGame: readNumber(player, "mpg"),
    pointsPerGame: readNumber(player, "ppg"),
    fieldGoalPercentage: readNumber(player, "fgPerc"),
    freeThrowPercentage: readNumber(player, "ftPerc"),
    threePointPercentage: readNumber(player, "tpPerc"),
    reboundsPerGame: readNumber(player, "rpg"),
    offensiveReboundsPerGame: readNumber(player, "orpg"),
    assistsPerGame: readNumber(player, "apg"),
    stealsPerGame: readNumber(player, "spg"),
    blocksPerGame: readNumber(player, "bpg"),
    turnoversPerGame: readNumber(player, "topg"),
    foulsPerGame: readNumber(player, "fpg"),
    rating: readNumber(player, "rating"),
  }));
}
