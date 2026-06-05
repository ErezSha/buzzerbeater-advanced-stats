import type { Player } from "@/domain/types";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import {
  childRecord,
  childRecords,
  readNumber,
  readString,
  requireString,
} from "@/server/bbapi/adapters/xml-utils";

export function parseRoster(document: BbapiXmlDocument): Player[] {
  const roster = childRecord(document.bbapi ?? null, "roster");

  return childRecords(roster, "player").map((player) => {
    const firstName = readString(player, "firstName") ?? "";
    const lastName = readString(player, "lastName") ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim();

    return {
      id: requireString(player, "unknown-player", "id", "playerid"),
      name: name || requireString(player, "Unknown player", "name"),
      position: readString(player, "bestPosition", "position"),
      age: readNumber(player, "age"),
      height: readString(player, "height"),
      salary: readNumber(player, "salary"),
      rosterStatus: "active",
    };
  });
}
