import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export interface LeagueTeamEntry {
  teamId: string;
  teamName: string;
}

export function parseStandings(document: BbapiXmlDocument): LeagueTeamEntry[] {
  const standings = childRecord(document.bbapi ?? null, "standings");
  const regularSeason = childRecord(standings, "regularSeason");
  const conferences = childRecords(regularSeason, "conference");

  return conferences.flatMap((conference) =>
    childRecords(conference, "team").map((team) => ({
      teamId: requireString(team, "unknown-team", "id", "teamid"),
      teamName: requireString(team, "Unknown team", "teamName", "name"),
    })),
  );
}
