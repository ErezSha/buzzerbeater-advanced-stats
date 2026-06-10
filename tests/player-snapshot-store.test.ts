import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPlayerSnapshotStore } from "@/server/data/player-snapshot-store";

describe("player snapshot store", () => {
  it("persists and reads the latest snapshot for a player", async () => {
    const directory = await mkdtemp(join(tmpdir(), "bbas-player-snapshots-"));
    const filePath = join(directory, "player-scouting.json");
    const store = createPlayerSnapshotStore({ filePath });

    await store.append("55713639", {
      savedAt: "2026-06-07T17:00:00.000Z",
      player: {
        id: "55713639",
        name: "Alex Prospect",
        rosterStatus: "unknown",
        forSale: true,
      },
      ownerTeam: {
        id: "276073",
        name: "Transfer Test Club",
      },
      summary: {
        playerId: "55713639",
        name: "Alex Prospect",
        rosterStatus: "unknown",
        games: 5,
        minutes: 46.6,
        points: 13,
        rebounds: 4.4,
        assists: 5.8,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fouls: 0,
        shooting: {
          fieldGoalPercentage: null,
          twoPointPercentage: null,
          threePointPercentage: null,
          freeThrowPercentage: null,
          effectiveFieldGoalPercentage: null,
          trueShootingAttempts: null,
          trueShootingPercentage: null,
        },
        turnoverPercentage: null,
        assistPercentage: null,
        blockPercentage: null,
        stealPercentage: null,
        reboundPercentage: null,
        usageRate: null,
        gameScoreTotal: null,
        gameScoreAverage: null,
        plusMinus: null,
        doubleDoubles: 0,
        tripleDoubles: 0,
        quadrupleDoubles: 0,
        fiveByFives: 0,
      },
    });

    const latest = await store.readLatest("55713639");

    expect(latest?.savedAt).toBe("2026-06-07T17:00:00.000Z");
    expect(latest?.summary.points).toBe(13);

    const file = await readFile(filePath, "utf8");
    expect(file).toContain("55713639");
  });
});
