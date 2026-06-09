import type { Match } from "@/domain/types";
import type { BbapiXmlDocument, XmlRecord } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  readNumber,
  readScoreValue,
  readString,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export function parseSchedule(
  document: BbapiXmlDocument,
  ownTeamId?: string | null,
): Match[] {
  const schedule = childRecord(document.bbapi ?? null, "schedule");
  const season = readString(schedule, "season");
  const GAME_WINDOW_MS = 4 * 60 * 60 * 1000; // games run ~2 h; 4 h gives a safe buffer
  const now = Date.now();

  return childRecords(schedule, "match").map((match) => {
    const homeTeam = childRecord(match, "homeTeam");
    const awayTeam = childRecord(match, "awayTeam");
    // const scores = childRecords(match, "score");
    // const scoreValues = childValues(match, "score");
    // const homeScore = readMatchScore(match, scores, true);
    // const awayScore = readMatchScore(match, scores, false);
    // const fallbackHomeScore = homeScore ?? readXmlNumber(scoreValues[0]);
    // const fallbackAwayScore = awayScore ?? readXmlNumber(scoreValues[1]);
    const homeTeamId = readString(homeTeam, "id", "teamid");
    const awayTeamId = readString(awayTeam, "id", "teamid");
    const opponentName =
      ownTeamId && ownTeamId === homeTeamId
        ? readString(awayTeam, "teamName", "name")
        : ownTeamId && ownTeamId === awayTeamId
          ? readString(homeTeam, "teamName", "name")
          : null;
    const date = requireString(match, "", "start", "date");

    const matchStart = new Date(date).getTime();
    const status: Match["status"] =
      matchStart > now
        ? "scheduled"
        : now - matchStart < GAME_WINDOW_MS
          ? "in_progress"
          : "finished";

    return {
      id: requireString(match, "unknown-match", "id", "matchid"),
      season,
      date,
      homeTeamId,
      awayTeamId,
      homeTeamName: readString(homeTeam, "teamName", "name"),
      awayTeamName: readString(awayTeam, "teamName", "name"),
      opponentName,
      // homeScore: fallbackHomeScore,
      // awayScore: fallbackAwayScore,
      status,
      type: readString(match, "type"),
    };
  });
}

function readMatchScore(
  match: XmlRecord,
  scores: XmlRecord[],
  home: boolean,
): number | null {
  const direct = readNumber(match, home ? "homeScore" : "awayScore");

  if (direct !== null) {
    return direct;
  }

  const keyedScore = scores.find((score) => {
    const type = readString(score, "type", "team", "side");
    return type?.toLowerCase() === (home ? "home" : "away");
  });

  if (keyedScore) {
    return readScoreValue(keyedScore);
  }

  return readScoreValue(scores[home ? 0 : 1]);
}
