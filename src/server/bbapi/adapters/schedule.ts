import type { Match } from "@/domain/types";
import type { BbapiXmlDocument, XmlRecord } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  childValues,
  readNumber,
  readScoreValue,
  readString,
  readXmlNumber,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export function parseSchedule(
  document: BbapiXmlDocument,
  ownTeamId?: string | null,
): Match[] {
  const schedule = childRecord(document.bbapi ?? null, "schedule");
  const season = readString(schedule, "season");

  return childRecords(schedule, "match").map((match) => {
    const homeTeam = childRecord(match, "homeTeam");
    const awayTeam = childRecord(match, "awayTeam");
    const scores = childRecords(match, "score");
    const scoreValues = childValues(match, "score");
    const homeScore = readMatchScore(match, scores, true);
    const awayScore = readMatchScore(match, scores, false);
    const fallbackHomeScore = homeScore ?? readXmlNumber(scoreValues[0]);
    const fallbackAwayScore = awayScore ?? readXmlNumber(scoreValues[1]);
    const homeTeamId = readString(homeTeam, "id", "teamid");
    const awayTeamId = readString(awayTeam, "id", "teamid");
    const opponentName =
      ownTeamId && ownTeamId === homeTeamId
        ? readString(awayTeam, "teamName", "name")
        : ownTeamId && ownTeamId === awayTeamId
          ? readString(homeTeam, "teamName", "name")
          : null;

    return {
      id: requireString(match, "unknown-match", "id", "matchid"),
      season,
      date: requireString(match, "", "start", "date"),
      homeTeamId,
      awayTeamId,
      homeTeamName: readString(homeTeam, "teamName", "name"),
      awayTeamName: readString(awayTeam, "teamName", "name"),
      opponentName,
      homeScore: fallbackHomeScore,
      awayScore: fallbackAwayScore,
      status:
        fallbackHomeScore !== null && fallbackAwayScore !== null
          ? "finished"
          : "scheduled",
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
