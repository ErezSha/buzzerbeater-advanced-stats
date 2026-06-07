import type { PlayerDetail } from "@/domain/types";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  childRecord,
  readNumber,
  readString,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export function parsePlayerDetail(document: BbapiXmlDocument): PlayerDetail {
  const player = childRecord(document.bbapi ?? null, "player");
  const skills = childRecord(player, "skills");
  const firstName = readString(player, "firstName") ?? "";
  const lastName = readString(player, "lastName") ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  const nationality = childRecord(player, "nationality");

  // TODO: BB's BBAPI only exposes individual skill ratings for players you own.
  // For sale players seen by other managers do not include skills in the XML response.
  // Web scraping would work but appears to be against BB TOS.

  return {
    id: requireString(player, "unknown-player", "id", "playerid"),
    name: name || requireString(player, "Unknown player", "name"),
    position: readString(player, "bestPosition", "position"),
    age: readNumber(player, "age"),
    height: readString(player, "height"),
    salary: readNumber(player, "salary"),
    rosterStatus: "unknown",
    ownerTeamId: readString(player, "owner", "teamid"),
    nationalityId: readString(nationality, "id"),
    nationalityName: readString(nationality, "#text", "name"),
    dmi: readNumber(player, "dmi"),
    jersey: readNumber(player, "jersey"),
    seasonDrafted: readNumber(player, "seasonDrafted"),
    leagueDrafted: readNumber(player, "leagueDrafted"),
    teamDrafted: readString(player, "teamDrafted"),
    draftPick: readNumber(player, "draftPick"),
    forSale: readString(player, "forSale") === "1",
    potential: readNumber(skills, "potential"),
    gameShape: readNumber(skills, "gameShape"),
    skills: null,
  };
}
