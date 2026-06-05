import type { BoxScore, PlayerGameStat, TeamGameStat } from "@/domain/types";
import type { BbapiXmlDocument, XmlRecord } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  readNumber,
  readString,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export function parseBoxScore(
  document: BbapiXmlDocument,
  fallbackMatchId: string,
): BoxScore {
  const match = childRecord(document.bbapi ?? null, "match");
  const matchId = requireString(match, fallbackMatchId, "id", "matchid");
  const homeTeam = parseTeamGameStat(
    childRecord(match, "homeTeam"),
    matchId,
    true,
  );
  const awayTeam = parseTeamGameStat(
    childRecord(match, "awayTeam"),
    matchId,
    false,
  );
  // const teamIds = new Set([homeTeam?.teamId, awayTeam?.teamId].filter(Boolean));
  const players = collectPlayerRows(match, matchId);

  return {
    matchId,
    homeTeam,
    awayTeam,
    players,
  };
}

function parseTeamGameStat(
  team: XmlRecord | null,
  matchId: string,
  isHome: boolean,
): TeamGameStat | null {
  if (!team) {
    return null;
  }

  const boxScore = childRecord(team, "boxscore");
  const teamTotals = childRecord(boxScore, "teamTotals");

  return {
    matchId,
    teamId: readString(team, "id", "teamid", "shortName"),
    teamName: readString(team, "teamName", "name"),
    offStrategy: readString(team, "offStrategy"),
    defStrategy: readString(team, "defStrategy"),
    isHome,
    points: readNumber(teamTotals, "pts"),
    fieldGoals: readNumber(teamTotals, "fgm"),
    fieldGoalAttempts: readNumber(teamTotals, "fga"),
    threePointMakes: readNumber(teamTotals, "tpm"),
    threePointAttempts: readNumber(teamTotals, "tpa"),
    freeThrows: readNumber(teamTotals, "ftm"),
    freeThrowAttempts: readNumber(teamTotals, "fta"),
    offensiveRebounds: readNumber(teamTotals, "oreb"),
    defensiveRebounds: readNumber(teamTotals, "dreb"),
    totalRebounds: readNumber(teamTotals, "reb"),
    assists: readNumber(teamTotals, "ast"),
    steals: readNumber(teamTotals, "stl"),
    blocks: readNumber(teamTotals, "blk"),
    turnovers: readNumber(teamTotals, "to", "tov"),
    fouls: readNumber(teamTotals, "PF", "pf"),
  };
}

function collectPlayerRows(
  match: XmlRecord | null,
  matchId: string,
): PlayerGameStat[] {
  const rows = ["homeTeam", "awayTeam"].flatMap((teamKey) => {
    const team = childRecord(match, teamKey);
    const boxscore = childRecord(team, "boxscore");
    return childRecords(boxscore, "player").map((player) => ({
      player,
      teamId: readString(team, "id", "teamid"),
    }));
  });

  return rows.map(({ player, teamId }) =>
    parsePlayerGameStat(player, matchId, teamId),
  );
}

function sumMins(minutesObj: XmlRecord | null): number {
  return ["PG", "SG", "SF", "PF", "C"].reduce((total, position) => {
    // Convert the string to a number. If it's undefined or invalid, default to 0.
    const mins = readNumber(minutesObj, position) || 0;
    return total + mins;
  }, 0);
}

function parsePlayerGameStat(
  player: XmlRecord,
  matchId: string,
  teamId: string | null,
): PlayerGameStat {
  const performance = childRecord(player, "performance");
  const minutesObj = childRecord(player, "minutes");

  const totalRebounds = readNumber(performance, "reb");
  const offensiveRebounds = readNumber(performance, "oreb");
  const defensiveRebounds =
    readNumber(player, "dreb") ??
    (totalRebounds !== null && offensiveRebounds !== null
      ? totalRebounds - offensiveRebounds
      : null);
  const fieldGoals = readNumber(performance, "fgm");
  const fieldGoalAttempts = readNumber(performance, "fga");
  const threePointMakes = readNumber(performance, "tpm");
  const threePointAttempts = readNumber(performance, "tpa");

  return {
    matchId,
    playerId: requireString(player, "unknown-player", "id", "playerid"),
    playerName: readPlayerName(player),
    teamId,
    minutes: sumMins(minutesObj),
    points: readNumber(performance, "pts"),
    fieldGoals,
    fieldGoalAttempts,
    twoPointMakes:
      fieldGoals !== null && threePointMakes !== null
        ? fieldGoals - threePointMakes
        : readNumber(player, "twpm", "twoPm"),
    twoPointAttempts:
      fieldGoalAttempts !== null && threePointAttempts !== null
        ? fieldGoalAttempts - threePointAttempts
        : readNumber(player, "twpa", "twoPa"),
    threePointMakes,
    threePointAttempts,
    freeThrows: readNumber(performance, "ftm"),
    freeThrowAttempts: readNumber(performance, "fta"),
    offensiveRebounds,
    defensiveRebounds,
    totalRebounds,
    assists: readNumber(performance, "ast"),
    steals: readNumber(performance, "stl"),
    blocks: readNumber(performance, "blk"),
    turnovers: readNumber(performance, "to", "tov"),
    fouls: readNumber(performance, "PF", "pf"),
  };
}

function readPlayerName(player: XmlRecord): string | null {
  const firstName = readString(player, "firstName") ?? "";
  const lastName = readString(player, "lastName") ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || readString(player, "name");
}
