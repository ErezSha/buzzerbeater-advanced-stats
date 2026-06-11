# Buzzerbeater Schemas

## Match types (from `schedule.aspx`)

| type | Description | Include in stats? |
|---|---|---|
| `league.rs` | Regular season league game | Yes |
| `league.rs.tv` | Regular season TV game | Yes |
| `league.quarterfinal` | League quarterfinal playoff game | Yes |
| `league.semifinal` | League semifinal playoff game | Yes |
| `league.final` | League final playoff game | Yes |
| `cup` | Domestic cup | Yes (default) |
| `bbm` | BuzzerBeater cross-league match | Yes (default) |
| `bbm.playoff` | BuzzerBeater cross-league playoff match | Yes (default) |
| `friendly` | Scrimmage | **No** (excluded by default) |
| `pl.rs` | Private league regular season | **No** (excluded by default) |
| `pl.rsneutral` | Private league regular season (neutral) | **No** (excluded by default) |
| `pl.po` | Private league playoffs | **No** (excluded by default) |
| `pl.poneutral` | Private league playoffs (neutral) | **No** (excluded by default) |

Playoff types (`league.quarterfinal`, `league.semifinal`, `league.final`) and `bbm.playoff` confirmed from season 71 live data. The All-Star game appears with a literal `unknown` type — treat it (and anything else unrecognized) as excluded.

Filtering is implemented in `src/server/data/refresh-league-data-full.ts` via `isLeagueMatch()` and in `src/server/data/refresh-dashboard-data.ts` via `isStatMatch()`.

**`teamstats.aspx` excludes playoffs.** Verified against season 71: a team that played 21 regular-season league games plus 4 league playoff games (`league.quarterfinal`/`semifinal`/`final`) reports max `games = 21` in teamstats totals. The in-game UI's season stats page agrees. So `teamstats` season stats are **regular-season-only** — they cannot represent a playoff or combined ("all") segment. Only per-game `boxscore.aspx` data can be partitioned by match type.

## teamstats.aspx

```xml
<bbapi version='1'>
  <teamStats teamid='91809' season='72' retrieved='2026-06-07T10:58:20Z'>
    <player id='50442364'>
      <firstName>Valery</firstName>
      <lastName>Levitskiy</lastName>
      <stats>
        <games>11</games>
        <mpg>28.2</mpg>
        <fgPerc>50</fgPerc>
        <tpPerc>40</tpPerc>
        <ftPerc>97.5</ftPerc>
        <orpg>1.5</orpg>
        <rpg>4.1</rpg>
        <apg>1.4</apg>
        <topg>0.9</topg>
        <spg>1.1</spg>
        <bpg>0.2</bpg>
        <ppg>17</ppg>
        <fpg>1.1</fpg>
        <rating>15.6</rating>
      </stats>
    </player>
    <!-- more players... -->
  </teamStats>
</bbapi>
```

Notes:
- Can be fetched for any team via `?teamid=<id>` (no authentication required beyond login)
- `games` counts only regular-season official league games (`league.rs`, `league.rs.tv`) — scrimmages, private league, **and playoffs** are excluded (playoff exclusion verified against season 71; see Match types section above)
- All stat fields are inside the nested `<stats>` element (not direct player attributes)

## roster.aspx

Retrieves the players belonging to a team (`?teamid=<id>`, defaults to the current user's team). Works for non-owned teams, and — unlike `player.aspx` — the `<skills>` block (including `gameShape`) is returned regardless of ownership.

```xml
<bbapi version="1">
  <roster retrieved="2026-06-05" teamid="100">
    <player id='49618046'>
      <firstName>Janek</firstName>
      <lastName>Ustav</lastName>
      <nationality id='41'>Eesti</nationality>
      <age>36</age>
      <height>82</height>
      <dmi>335400</dmi>
      <injury>1</injury>
      <salary>72440</salary>
      <bestPosition>PF</bestPosition>
      <seasonDrafted>53</seasonDrafted>
      <leagueDrafted>1767</leagueDrafted>
      <teamDrafted>123088</teamDrafted>
      <draftPick>20</draftPick>
      <forSale>1</forSale>
      <skills>
        <gameShape>7</gameShape>
        <potential>10</potential>
      </skills>
    </player>
    <!-- more players... -->
  </roster>
</bbapi>
```

Notes:
- `<injury>N</injury>` where N is the number of weeks remaining on the injury — the element is absent for healthy players. Any non-zero value means injured. (Confirmed values: 1, 2.)
- `<skills><gameShape>` is the BuzzerBeater game shape (1–10), available for owned and non-owned teams.
- Adapter: `src/server/bbapi/adapters/roster.ts` → `Player[]` (maps `injured` + `gameShape`). Fixture: `tests/fixtures/bbapi/roster.xml`.

## player.aspx

Live smoke check on June 7, 2026 confirmed that `player.aspx?playerid=<id>` works for transfer-market player `55713639`.

```xml
<bbapi version='1'>
  <player id='55713639' owner='276073' retrieved='2026-06-07T13:53:08Z'>
    <firstName>Gora</firstName>
    <lastName>Ward</lastName>
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
</bbapi>
```

Redacted fixture: `tests/fixtures/bbapi/player.xml`

Notes:
- Required parameter: `?playerid=<id>`
- The response includes player identity, owner team id, draft metadata, `forSale`, and a small `<skills>` block
- The live transfer-market response did **not** include season averages, box score rows, or any counting-stat totals
- That means `player.aspx` alone is not enough for our advanced metrics pipeline; a future single-player dashboard will need additional stat sources such as `teamstats.aspx` and finished-game `boxscore.aspx`



## Match

```json
{
  neutral: '0',
  startTime: '2026-05-30T14:55:00Z',
  endTime: '2026-05-30T16:36:47Z',
  effortDelta: '1',
  attendance: {
    bleachers: '7000',
    lowerTier: '780',
    courtside: '200',
    luxury: '20'
  },
  awayTeam: {
    teamName: 'Shazabooy',
    shortName: 'SKA',
    score: { '#text': '124', partials: '32,28,27,37' },
    offStrategy: 'LookInside',
    defStrategy: 'ManToMan',
    effort: 'takeItEasy',
    boxscore: { player: [Array], teamTotals: [Object] },
    ratings: {
      outsideScoring: '7',
      insideScoring: '10',
      outsideDefense: '10.6',
      insideDefense: '9.6',
      rebounding: '8',
      offensiveFlow: '9'
    },
    efficiency: { PG: '114.6', SG: '106.5', SF: '130.1', PF: '127.1', C: '134.4' },
    gdp: { focus: 'Balanced.hit', pace: 'Slow.hit' },
    id: '149530'
  },
  homeTeam: {
    teamName: 'Maccabi Megiddo',
    shortName: 'MMG',
    score: { '#text': '82', partials: '19,23,20,20' },
    offStrategy: 'Patient',
    defStrategy: 'ManToMan',
    boxscore: { player: [Array], teamTotals: [Object] },
    ratings: {
      outsideScoring: '8.3',
      insideScoring: '6.6',
      outsideDefense: '7',
      insideDefense: '5.6',
      rebounding: '5',
      offensiveFlow: '7'
    },
    efficiency: { PG: '85.3', SG: '48.4', SF: '63.9', PF: '64.2', C: '61.8' },
    gdp: { focus: 'N/A', pace: 'N/A' },
    id: '37928'
  },
  id: '138978595',
  retrieved: '2026-06-05T21:11:24Z',
  type: 'league.rs'
}
```

## Boxscore of a single team - from a match

```json
{
  player: [...playerRow]
  teamTotals: {fgm: '43',fga: '87',tpm: '1',tpa: '7',ftm: '18',fta: '22',oreb: '11',
    reb: '52',ast: '26',to: '8',stl: '7',blk: '3',pf: '12',pts: '105'}
}
```

## standings.aspx

Called without params to get the logged-in user's league. Teams are grouped into conferences under `regularSeason`.

```xml
<bbapi version='1'>
  <standings season='72' retrieved='2026-06-07T20:38:39Z'>
    <league id='1003' level='2'>II.4</league>
    <country id='15'>Israel</country>
    <regularSeason>
      <conference>
        <team id='92018'>
          <teamName>B.C. Basket stars</teamName>
          <wins>11</wins>
          <losses>0</losses>
          <pf>1134</pf>
          <pa>912</pa>
          <isBot>0</isBot>
          <forfeits>0</forfeits>
        </team>
        <!-- more teams in this conference... -->
      </conference>
      <conference>
        <!-- second conference teams... -->
      </conference>
    </regularSeason>
  </standings>
</bbapi>
```

Parsed JSON shape (relevant part):
```json
{
  "bbapi": {
    "standings": {
      "league": { "#text": "II.4", "id": "1003", "level": "2" },
      "country": { "#text": "Israel", "id": "15" },
      "regularSeason": {
        "conference": [
          { "team": [ { "teamName": "B.C. Basket stars", "id": "92018", "wins": 11, "losses": 0, ... } ] },
          { "team": [ ... ] }
        ]
      }
    }
  }
}
```

Adapter: `src/server/bbapi/adapters/standings.ts` — flattens all conferences into a single `LeagueTeamEntry[]`.

## teamstats.aspx?teamid=X&mode=totals

Root element is `teamTotals` (not `teamStats`). Stats are in a `totals` child element (not `stats`). Note: `dreb` is absent; compute as `reb - oreb`.

```xml
<bbapi version='1'>
  <teamTotals teamid='149530' season='72' retrieved='2026-06-07T20:38:39Z'>
    <player id='53791622'>
      <firstName>Dvir</firstName>
      <lastName>Levin</lastName>
      <totals>
        <games>11</games>
        <minutes>342</minutes>
        <fgm>63</fgm>
        <fga>128</fga>
        <tpm>11</tpm>
        <tpa>30</tpa>
        <ftm>18</ftm>
        <fta>21</fta>
        <oreb>9</oreb>
        <reb>28</reb>
        <!-- dreb absent: compute as reb - oreb -->
        <ast>45</ast>
        <to>8</to>
        <stl>10</stl>
        <blk>4</blk>
        <pf>9</pf>
        <pts>155</pts>
        <rating>14.3</rating>
      </totals>
    </player>
    <!-- more players... -->
  </teamTotals>
</bbapi>
```

Adapter: `src/server/bbapi/adapters/league-team-stats.ts` → `LeaguePlayerStatTotal[]`.

## Player row in a game - from a boxscore

```json
{
  firstName: 'Dvir',
  lastName: 'Levin',
  minutes: { PG: '0', SG: '28', SF: '0', PF: '0', C: '0' },
  performance: {fgm: '6',fga: '11',tpm: '0',tpa: '0',ftm: '0',fta: '0',oreb: '2',reb: '7',
    ast: '5',to: '1',stl: '1',blk: '0',pf: '1',pts: '12',rating: '16',plusMinus: '+19'},
  isStarter: 'True',
  id: '53791622'
}
```
