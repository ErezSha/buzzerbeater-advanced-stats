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
