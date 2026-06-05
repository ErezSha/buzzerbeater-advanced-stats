# Buzzerbeater Schemas

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
