import type { Team } from "@/domain/types";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import { childRecord, readString, requireString } from "@/server/bbapi/adapters/xml-utils";

export function parseTeamInfo(document: BbapiXmlDocument): Team {
  const team = childRecord(document.bbapi ?? null, "team");
  const league = childRecord(team, "league");
  const country = childRecord(team, "country");

  return {
    id: requireString(team, "unknown-team", "id", "teamid"),
    name: requireString(team, "Unknown team", "teamName", "name"),
    owner: readString(team, "owner", "ownerName", "manager"),
    leagueId: readString(league, "id"),
    countryId: readString(country, "id"),
  };
}
