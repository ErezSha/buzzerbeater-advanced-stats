import { analyzeSinglePlayer } from "@/server/data/analyze-single-player";
import type { BbapiClient } from "@/server/bbapi/client";
import type { BbapiDataEndpoint, BbapiRequestParams } from "@/server/bbapi/endpoints";
import type { BbapiXmlDocument } from "@/server/bbapi/xml";
import { parseBbapiXml } from "@/server/bbapi/xml";
import type { CacheStore } from "@/server/cache/cache-store";
import { createPlayerSnapshotStore } from "@/server/data/player-snapshot-store";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function noopCacheStore(): CacheStore {
  return {
    async get() { return null; },
    async set() {},
    async delete() {},
    async clearByPrefix() {},
  };
}

describe("single player analysis data flow", () => {
  it("fetches an external player, resolves the owner team, and derives player metrics", async () => {
    const client = new SinglePlayerFixtureClient();
    const directory = await mkdtemp(join(tmpdir(), "bbas-player-analysis-"));
    const snapshotStore = createPlayerSnapshotStore({
      filePath: join(directory, "player-scouting.json"),
    });

    const analysis = await analyzeSinglePlayer("55713639", {
      client,
      snapshotStore,
      cacheStore: noopCacheStore(),
    });

    expect(analysis.player).toMatchObject({
      id: "55713639",
      ownerTeamId: "276073",
      forSale: true,
    });
    expect(analysis.ownerTeam).toMatchObject({
      id: "276073",
      name: "Transfer Test Club",
    });
    expect(analysis.summary).toMatchObject({
      playerId: "55713639",
      name: "Alex Prospect",
      position: "PG",
      games: 1,
      points: 12,
      assists: 2,
      rebounds: 3,
    });
    expect(analysis.summary.usageRate).toEqual(expect.any(Number));
    expect(analysis.boxScoreCount).toBe(1);
    expect(analysis.finishedMatchCount).toBe(1);
    expect(analysis.previousSnapshot).toBeNull();
    expect(client.loggedOut).toBe(true);
    expect(client.requests.map((request) => request.endpoint)).toEqual([
      "player.aspx",
      "teaminfo.aspx",
      "schedule.aspx",
      "teamstats.aspx",
      "boxscore.aspx",
    ]);
  });

  it("returns the previously saved scouting snapshot on a later fetch", async () => {
    const directory = await mkdtemp(join(tmpdir(), "bbas-player-analysis-"));
    const snapshotStore = createPlayerSnapshotStore({
      filePath: join(directory, "player-scouting.json"),
    });

    await snapshotStore.append("55713639", {
      savedAt: "2026-06-01T12:00:00.000Z",
      player: {
        id: "55713639",
        name: "Alex Prospect",
        rosterStatus: "unknown",
        salary: 3200,
        dmi: 44000,
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
        games: 4,
        minutes: 40,
        points: 10,
        rebounds: 3,
        assists: 4,
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
      },
    });

    const analysis = await analyzeSinglePlayer("55713639", {
      client: new SinglePlayerFixtureClient(),
      snapshotStore,
      cacheStore: noopCacheStore(),
    });

    expect(analysis.previousSnapshot).toMatchObject({
      savedAt: "2026-06-01T12:00:00.000Z",
      player: {
        salary: 3200,
        dmi: 44000,
      },
      summary: {
        points: 10,
      },
    });
  });
});

class SinglePlayerFixtureClient implements BbapiClient {
  readonly requests: Array<{
    endpoint: BbapiDataEndpoint;
    params: BbapiRequestParams | undefined;
  }> = [];
  loggedOut = false;

  async login(): Promise<void> {
    return;
  }

  async logout(): Promise<void> {
    this.loggedOut = true;
  }

  async requestPage(
    endpoint: BbapiDataEndpoint,
    params?: BbapiRequestParams,
  ): Promise<BbapiXmlDocument> {
    this.requests.push({ endpoint, params });

    switch (endpoint) {
      case "player.aspx":
        expect(params).toMatchObject({ playerid: "55713639" });
        return xml(
          endpoint,
          `<?xml version='1.0' encoding='utf-8'?>
<bbapi version='1'>
  <player id='55713639' owner='276073' retrieved='2026-06-07T13:53:08Z'>
    <firstName>Alex</firstName>
    <lastName>Prospect</lastName>
    <nationality id='95'>Barbados</nationality>
    <age>18</age>
    <height>78</height>
    <dmi>54600</dmi>
    <jersey>10</jersey>
    <salary>3636</salary>
    <bestPosition>PG</bestPosition>
    <seasonDrafted>71</seasonDrafted>
    <leagueDrafted>17715</leagueDrafted>
    <teamDrafted>276073</teamDrafted>
    <draftPick>6</draftPick>
    <forSale>1</forSale>
    <skills>
      <gameShape>9</gameShape>
      <potential>7</potential>
    </skills>
  </player>
</bbapi>`,
        );
      case "teaminfo.aspx":
        expect(params).toMatchObject({ teamid: "276073" });
        return xml(
          endpoint,
          `<?xml version='1.0' encoding='utf-8'?>
<bbapi version='1'>
  <team id='276073' retrieved='2026-06-07T13:58:00Z'>
    <teamName>Transfer Test Club</teamName>
    <owner>Test Manager</owner>
    <league id='17715' level='4' />
    <country id='95'>Barbados</country>
  </team>
</bbapi>`,
        );
      case "schedule.aspx":
        expect(params).toMatchObject({ teamid: "276073" });
        return xml(
          endpoint,
          `<?xml version='1.0' encoding='utf-8'?>
<bbapi version='1'>
  <schedule teamid='276073' season='72' retrieved='2026-06-07T13:58:00Z'>
    <match id='139581889' start='2026-06-01T18:00:00Z' type='league.rs'>
      <homeTeam id='276073'>
        <teamName>Transfer Test Club</teamName>
        <score partials='18,17,20,22'>77</score>
      </homeTeam>
      <awayTeam id='888888'>
        <teamName>Opponent One</teamName>
        <score partials='30,26,24,18'>98</score>
      </awayTeam>
    </match>
  </schedule>
</bbapi>`,
        );
      case "teamstats.aspx":
        expect(params).toMatchObject({ teamid: "276073" });
        return xml(
          endpoint,
          `<?xml version='1.0' encoding='utf-8'?>
<bbapi version='1'>
  <teamStats teamid='276073' season='72' retrieved='2026-06-07T13:58:00Z'>
    <player id='55713639'>
      <firstName>Alex</firstName>
      <lastName>Prospect</lastName>
      <stats>
        <games>5</games>
        <mpg>46.6</mpg>
        <fgPerc>40.6</fgPerc>
        <tpPerc>42.1</tpPerc>
        <ftPerc>35.7</ftPerc>
        <orpg>0.8</orpg>
        <rpg>4.4</rpg>
        <apg>5.8</apg>
        <topg>2.6</topg>
        <spg>1.4</spg>
        <bpg>0.8</bpg>
        <ppg>13</ppg>
        <fpg>2.4</fpg>
        <rating>6.1</rating>
      </stats>
    </player>
  </teamStats>
</bbapi>`,
        );
      case "boxscore.aspx":
        expect(params).toMatchObject({ matchid: "139581889" });
        return xml(
          endpoint,
          `<?xml version='1.0' encoding='utf-8'?>
<bbapi version='1'>
  <match id='139581889' retrieved='2026-06-07T13:58:00Z' type='league.rs'>
    <homeTeam id='276073'>
      <teamName>Transfer Test Club</teamName>
      <score partials='18,17,20,22'>77</score>
      <boxscore>
        <player id='55713639'>
          <firstName>Alex</firstName>
          <lastName>Prospect</lastName>
          <minutes>
            <PG>48</PG>
            <SG>0</SG>
            <SF>0</SF>
            <PF>0</PF>
            <C>0</C>
          </minutes>
          <performance>
            <fgm>5</fgm>
            <fga>12</fga>
            <tpm>2</tpm>
            <tpa>5</tpa>
            <ftm>0</ftm>
            <fta>2</fta>
            <oreb>1</oreb>
            <reb>3</reb>
            <ast>2</ast>
            <to>2</to>
            <stl>0</stl>
            <blk>0</blk>
            <PF>3</PF>
            <pts>12</pts>
          </performance>
          <isStarter>True</isStarter>
        </player>
        <teamTotals>
          <fgm>28</fgm>
          <fga>72</fga>
          <tpm>7</tpm>
          <tpa>23</tpa>
          <ftm>14</ftm>
          <fta>21</fta>
          <oreb>10</oreb>
          <reb>35</reb>
          <ast>15</ast>
          <to>14</to>
          <stl>5</stl>
          <blk>2</blk>
          <PF>18</PF>
          <pts>77</pts>
        </teamTotals>
      </boxscore>
    </homeTeam>
    <awayTeam id='888888'>
      <teamName>Opponent One</teamName>
      <score partials='30,26,24,18'>98</score>
      <boxscore>
        <player id='900001'>
          <firstName>Pat</firstName>
          <lastName>Opponent</lastName>
          <minutes>
            <PG>36</PG>
          </minutes>
          <performance>
            <fgm>7</fgm>
            <fga>15</fga>
            <tpm>1</tpm>
            <tpa>4</tpa>
            <ftm>3</ftm>
            <fta>4</fta>
            <oreb>2</oreb>
            <reb>6</reb>
            <ast>4</ast>
            <to>3</to>
            <stl>1</stl>
            <blk>1</blk>
            <PF>2</PF>
            <pts>18</pts>
          </performance>
          <isStarter>True</isStarter>
        </player>
        <teamTotals>
          <fgm>35</fgm>
          <fga>74</fga>
          <tpm>8</tpm>
          <tpa>21</tpa>
          <ftm>20</ftm>
          <fta>26</fta>
          <oreb>11</oreb>
          <reb>42</reb>
          <ast>19</ast>
          <to>12</to>
          <stl>7</stl>
          <blk>4</blk>
          <PF>16</PF>
          <pts>98</pts>
        </teamTotals>
      </boxscore>
    </awayTeam>
  </match>
</bbapi>`,
        );
      default:
        throw new Error(`Unexpected endpoint: ${endpoint}`);
    }
  }
}

function xml(endpoint: BbapiDataEndpoint, input: string): BbapiXmlDocument {
  return parseBbapiXml(input, endpoint);
}
