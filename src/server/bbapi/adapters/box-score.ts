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
  const effortDelta = readNumber(match, "effortDelta");
  const homeTeam = parseTeamGameStat(
    childRecord(match, "homeTeam"),
    matchId,
    true,
    effortDelta,
  );
  const awayTeam = parseTeamGameStat(
    childRecord(match, "awayTeam"),
    matchId,
    false,
    effortDelta,
  );

  const players = collectPlayerRows(match, matchId);

  return {
    matchId,
    homeTeam,
    awayTeam,
    players,
  };
}

/**
 * Maps effortDelta (homeEffort − awayEffort, 0=easy 1=normal 2=crunch) to a
 * human-readable camelCase label for this team.
 * personal = delta for home, −delta for away.
 *   +2 → crunchTime (certain)
 *   +1 → higherEffort (ambiguous: crunch-vs-normal OR normal-vs-easy)
 *    0 → normal
 *   −1 → lowerEffort
 *   −2 → takeItEasy (certain)
 */
function effortLabel(delta: number | null, isHome: boolean): string | null {
  if (delta === null) return null;
  const personal = isHome ? delta : -delta;
  if (personal >= 2) return "crunchTime";
  if (personal === 1) return "higherEffort";
  if (personal === 0) return "sameEffort";
  if (personal === -1) return "lowerEffort";
  return "takeItEasy";
}

function parseTeamGameStat(
  team: XmlRecord | null,
  matchId: string,
  isHome: boolean,
  effortDelta: number | null = null,
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
    effort: effortLabel(effortDelta, isHome),
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

const POSITIONS = ["PG", "SG", "SF", "PF", "C"] as const;

function sumMins(minutesObj: XmlRecord | null): number {
  return POSITIONS.reduce((total, position) => {
    const mins = readNumber(minutesObj, position) || 0;
    return total + mins;
  }, 0);
}

function mostPlayedPosition(minutesObj: XmlRecord | null): string | null {
  let best: string | null = null;
  let bestMins = 0;
  for (const pos of POSITIONS) {
    const mins = readNumber(minutesObj, pos) ?? 0;
    if (mins > bestMins) {
      bestMins = mins;
      best = pos;
    }
  }
  return best;
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
    mostPlayedPosition: mostPlayedPosition(minutesObj),
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
    plusMinus: readNumber(performance, "plusMinus"),
  };
}

function readPlayerName(player: XmlRecord): string | null {
  const firstName = readString(player, "firstName") ?? "";
  const lastName = readString(player, "lastName") ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || readString(player, "name");
}
