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

  return childRecords(teamStats, "player").map((player) => {
    const stats = childRecord(player, "stats");
    return {
      playerId: requireString(player, "unknown-player", "id", "playerid"),
      games: readNumber(stats, "games"),
      minutesPerGame: readNumber(stats, "mpg"),
      pointsPerGame: readNumber(stats, "ppg"),
      fieldGoalPercentage: readNumber(stats, "fgPerc"),
      freeThrowPercentage: readNumber(stats, "ftPerc"),
      threePointPercentage: readNumber(stats, "tpPerc"),
      reboundsPerGame: readNumber(stats, "rpg"),
      offensiveReboundsPerGame: readNumber(stats, "orpg"),
      assistsPerGame: readNumber(stats, "apg"),
      stealsPerGame: readNumber(stats, "spg"),
      blocksPerGame: readNumber(stats, "bpg"),
      turnoversPerGame: readNumber(stats, "topg"),
      foulsPerGame: readNumber(stats, "fpg"),
      rating: readNumber(stats, "rating"),
    };
  });
}
