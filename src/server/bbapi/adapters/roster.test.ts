import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRoster } from "@/server/bbapi/adapters/roster";
import { parseBbapiXml } from "@/server/bbapi/xml";

function loadFixture(name: string) {
  const xml = readFileSync(
    path.resolve(__dirname, "../../../../tests/fixtures/bbapi", name),
    "utf8",
  );
  return parseBbapiXml(xml, "roster.aspx");
}

describe("parseRoster", () => {
  const players = parseRoster(loadFixture("roster-injuries.xml"));

  it("parses every player on the roster", () => {
    expect(players).toHaveLength(2);
    expect(players.map((p) => p.name)).toEqual(["Janek Ustav", "Florus Vermeire"]);
  });

  it("flags the injured player and reads game shape", () => {
    const janek = players.find((p) => p.id === "49618046")!;
    expect(janek.injured).toBe(true);
    expect(janek.gameShape).toBe(7);
  });

  it("treats a missing <injury> element as healthy", () => {
    const florus = players.find((p) => p.id === "49550093")!;
    expect(florus.injured).toBe(false);
    expect(florus.gameShape).toBe(6);
  });
});
