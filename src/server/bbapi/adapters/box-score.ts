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
  const homeTeam = parseTeamGameStat(childRecord(match, "homeTeam"), matchId, true);
  const awayTeam = parseTeamGameStat(childRecord(match, "awayTeam"), matchId, false);
  const teamIds = new Set([homeTeam?.teamId, awayTeam?.teamId].filter(Boolean));
  const players = collectPlayerRows(match, matchId, teamIds);

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

  return {
    matchId,
    teamId: readString(team, "id", "teamid"),
    teamName: readString(team, "teamName", "name"),
    isHome,
    points: readNumber(team, "pts", "score"),
    fieldGoals: readNumber(team, "fgm"),
    fieldGoalAttempts: readNumber(team, "fga"),
    threePointMakes: readNumber(team, "tpm"),
    threePointAttempts: readNumber(team, "tpa"),
    freeThrows: readNumber(team, "ftm"),
    freeThrowAttempts: readNumber(team, "fta"),
    offensiveRebounds: readNumber(team, "oreb"),
    defensiveRebounds: readNumber(team, "dreb"),
    totalRebounds: readNumber(team, "reb"),
    assists: readNumber(team, "ast"),
    steals: readNumber(team, "stl"),
    blocks: readNumber(team, "blk"),
    turnovers: readNumber(team, "to", "tov"),
    fouls: readNumber(team, "PF", "pf"),
  };
}

function collectPlayerRows(
  match: XmlRecord | null,
  matchId: string,
  teamIds: Set<string | null | undefined>,
): PlayerGameStat[] {
  const directRows = childRecords(match, "player");
  const nestedRows = ["homeTeam", "awayTeam"].flatMap((teamKey) => {
    const team = childRecord(match, teamKey);
    return childRecords(team, "player").map((player) => ({
      player,
      teamId: readString(team, "id", "teamid"),
    }));
  });

  const rows =
    nestedRows.length > 0
      ? nestedRows
      : directRows.map((player) => ({
          player,
          teamId: teamIds.has(readString(player, "teamid", "teamId"))
            ? readString(player, "teamid", "teamId")
            : null,
        }));

  return rows.map(({ player, teamId }) => parsePlayerGameStat(player, matchId, teamId));
}

function parsePlayerGameStat(
  player: XmlRecord,
  matchId: string,
  teamId: string | null,
): PlayerGameStat {
  const totalRebounds = readNumber(player, "reb");
  const offensiveRebounds = readNumber(player, "oreb");
  const defensiveRebounds =
    readNumber(player, "dreb") ??
    (totalRebounds !== null && offensiveRebounds !== null
      ? totalRebounds - offensiveRebounds
      : null);
  const fieldGoals = readNumber(player, "fgm");
  const fieldGoalAttempts = readNumber(player, "fga");
  const threePointMakes = readNumber(player, "tpm");
  const threePointAttempts = readNumber(player, "tpa");

  return {
    matchId,
    playerId: requireString(player, "unknown-player", "id", "playerid"),
    playerName: readPlayerName(player),
    teamId,
    minutes: readNumber(player, "min", "minutes"),
    points: readNumber(player, "pts"),
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
    freeThrows: readNumber(player, "ftm"),
    freeThrowAttempts: readNumber(player, "fta"),
    offensiveRebounds,
    defensiveRebounds,
    totalRebounds,
    assists: readNumber(player, "ast"),
    steals: readNumber(player, "stl"),
    blocks: readNumber(player, "blk"),
    turnovers: readNumber(player, "to", "tov"),
    fouls: readNumber(player, "PF", "pf"),
  };
}

function readPlayerName(player: XmlRecord): string | null {
  const firstName = readString(player, "firstName") ?? "";
  const lastName = readString(player, "lastName") ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || readString(player, "name");
}
