# BuzzerBeater Advanced Stats PRD

## 1. Overview

Build a personal web tool for analyzing a BuzzerBeater team with modern basketball statistics that are not readily available in the game UI. The app should use BuzzerBeater's BBAPI as the source of truth, calculate derived advanced metrics from team, roster, schedule, and box score data, and present the results in a simple React + shadcn/ui interface.

This is a private personal tool first. The product should optimize for fast setup, trustworthy calculations, and clear team/player comparison rather than broad multi-user SaaS behavior.

## 2. Goals

- Authenticate with BBAPI using the user's login name and read-only security code.
- Fetch the user's team context, roster, schedule, seasonal team stats, and finished game box scores.
- Calculate useful advanced statistics for players and team performance.
- Provide sortable, filterable views for players, games, and trends.
- Make it easy to answer practical team-management questions:
  - Which players are most efficient?
  - Which players carry the largest offensive load?
  - Which players are improving or declining over the season?
  - Which games exposed rebounding, shooting, turnover, or pace issues?
  - How does my team profile compare across recent matches?

## 3. Non-Goals

- Public hosting for many users.
- Real-money transfer market recommendations.
- Automated lineup or tactics decisions.
- Full historical league-wide analytics beyond the user's team.
- Exact NBA-grade metrics when BBAPI does not expose enough source data.
- Play-by-play-only features in MVP, because `pbp.aspx` may be Supporter-only.

## 4. Target User

The primary user is a BuzzerBeater manager who wants a modern analytics dashboard for their own team. They understand basketball concepts but should not need to manually export data or maintain spreadsheets.

## 5. Source References

- BBAPI reference: `docs/references/buzzerbeater-api.md`
- Basketball statistics glossary: `docs/references/glossary.md`
- Win Shares glossary: `docs/references/win-shares.md`

## 6. Data Sources

The app should use the following BBAPI endpoints:

| Endpoint | Purpose | MVP Use |
| --- | --- | --- |
| `login.aspx` | Start authenticated session with login and read-only code | Required |
| `logout.aspx` | End authenticated session | Required |
| `teaminfo.aspx` | Current team name, ID, owner info | Required |
| `roster.aspx` | Current players and player metadata | Required |
| `schedule.aspx` | Season match list and results | Required |
| `boxscore.aspx` | Per-game team and player performance | Required |
| `teamstats.aspx` | Season player averages/totals | Required |
| `standings.aspx` | League context | Nice-to-have |
| `seasons.aspx` | Available season list | Nice-to-have |
| `player.aspx` | Deeper player detail | Nice-to-have |
| `pbp.aspx` | Play-by-play and lineups | Post-MVP, Supporter-only |

BBAPI returns XML. Dates are UTC ISO timestamps.

## 7. Authentication and Configuration

For the first implementation, use local environment variables rather than an in-app credential store:

- `BB_LOGIN`
- `BB_SECURITY_CODE`
- Optional: `BB_SECOND_TEAM=1`

The app server should hold credentials and call BBAPI server-side. The browser should never receive the security code.

Session handling requirements:

- On startup or first API request, call `login.aspx`.
- Preserve the authentication cookie for subsequent BBAPI requests.
- Retry login once if BBAPI returns `NotAuthorized`.
- Call `logout.aspx` when explicitly requested or when the server process shuts down if practical.
- Surface BBAPI errors clearly in the UI.

## 8. Product Experience

### 8.1 App Shell

Use a compact dashboard layout:

- Top bar with team name, selected season, refresh status, and manual refresh action.
- Left navigation or tab navigation for major views.
- Main content optimized for tables, charts, and comparison panels.

Expected primary sections:

- Overview
- Players
- Games
- Trends
- Glossary

### 8.2 Overview

Purpose: Show the current state of the team at a glance.

Content:

- Team identity and selected season.
- Record summary from schedule data.
- Recent game results.
- Team four-factor profile:
  - eFG%
  - TOV%
  - ORB%
  - FT rate
- Top players by selected metrics:
  - True Shooting %
  - Usage %
  - Game Score per game
  - Rebounds %
  - Assists %
- Simple alerts for notable patterns, such as low sample size, poor shooting efficiency, high turnover rate, or heavy usage concentration.

### 8.3 Players

Purpose: Compare players and identify contributors.

Content:

- Sortable player table.
- Column visibility controls.
- Filters for active roster, minimum games, and minimum minutes.
- Player detail drawer or page with season summary and game log.

Core columns:

- Player name
- Position
- Age
- Games
- Minutes
- Points
- Rebounds
- Assists
- Steals
- Blocks
- Turnovers
- Fouls
- FG%, 2P%, 3P%, FT%
- eFG%
- TS%
- Usage %
- AST%
- ORB%, DRB%, TRB%
- TOV%
- Game Score
- Per-minute or per-36 style rates

### 8.4 Games

Purpose: Review finished matches and understand why the team won or lost.

Content:

- Schedule table with opponent, date, result, score, match type, and box score status.
- Game detail view:
  - Team score comparison.
  - Player box score table.
  - Four factors for both teams when source data allows.
  - Game Score by player.
  - Pace/possession estimate.

### 8.5 Trends

Purpose: Show performance over time.

Content:

- Recent games chart for team points, opponent points, margin, estimated possessions, ORtg, and DRtg.
- Player trend chart for selected player and selected metric.
- Rolling averages over the last 3, 5, and 10 games where enough data exists.

### 8.6 Glossary

Purpose: Make advanced stats understandable inside the app.

Content:

- Searchable glossary of implemented metrics.
- Formula display for each metric.
- Short interpretation notes.
- Data availability notes when BBAPI limitations affect a metric.

## 9. Metrics

### 9.1 MVP Metrics

Implement these first because they can usually be calculated from box scores and team totals:

| Metric | Formula | Level |
| --- | --- | --- |
| FG% | `FG / FGA` | Player, team |
| 2P% | `2P / 2PA` | Player, team |
| 3P% | `3P / 3PA` | Player, team |
| FT% | `FT / FTA` | Player, team |
| eFG% | `(FG + 0.5 * 3P) / FGA` | Player, team |
| TSA | `FGA + 0.44 * FTA` | Player, team |
| TS% | `PTS / (2 * TSA)` | Player, team |
| TOV% | `100 * TOV / (FGA + 0.44 * FTA + TOV)` | Player, team |
| Game Score | `PTS + 0.4*FG - 0.7*FGA - 0.4*(FTA-FT) + 0.7*ORB + 0.3*DRB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TOV` | Player |
| Estimated possessions | `FGA + 0.44*FTA - ORB + TOV` as a simple estimate; use more exact formula if opponent rebounding data is available | Team, game |
| ORtg | `100 * PTS / possessions` | Team, game |
| DRtg | `100 * Opp PTS / possessions` | Team, game |
| Pace | Possessions per game, normalized if minutes are available | Team, game |

All percentage metrics must handle zero denominators by returning `null` rather than `0`.

### 9.2 Conditional Metrics

Implement when required team/opponent totals and minutes are available:

| Metric | Formula | Notes |
| --- | --- | --- |
| Usage % | `100 * ((FGA + 0.44*FTA + TOV) * (Team MP / 5)) / (MP * (Team FGA + 0.44*Team FTA + Team TOV))` | Requires player minutes and team minutes |
| AST% | `100 * AST / (((MP / (Team MP / 5)) * Team FG) - FG)` | Requires player minutes and team field goals |
| ORB% | `100 * (ORB * (Team MP / 5)) / (MP * (Team ORB + Opp DRB))` | Requires opponent defensive rebounds |
| DRB% | `100 * (DRB * (Team MP / 5)) / (MP * (Team DRB + Opp ORB))` | Requires opponent offensive rebounds |
| TRB% | `100 * (TRB * (Team MP / 5)) / (MP * (Team TRB + Opp TRB))` | Requires total rebound data |

### 9.3 Post-MVP Metrics

- Plus/minus from play-by-play or lineup data if available.
- Lineup combinations.
- Player on/off splits.
- Strength of schedule or SRS-style estimates.
- Win probability model.
- Transfer value heuristics.

## 10. Data Model

Suggested internal entities:

- `Team`
  - `id`
  - `name`
  - `owner`
  - `leagueId`
- `Season`
  - `id`
  - `startDate`
  - `endDate`
- `Player`
  - `id`
  - `name`
  - `position`
  - `age`
  - `height`
  - `salary`
  - `rosterStatus`
- `Match`
  - `id`
  - `season`
  - `date`
  - `homeTeamId`
  - `awayTeamId`
  - `homeScore`
  - `awayScore`
  - `status`
  - `type`
- `PlayerGameStat`
  - `matchId`
  - `playerId`
  - base box score fields
  - derived metric fields
- `TeamGameStat`
  - `matchId`
  - `teamId`
  - base team box score fields
  - derived metric fields
- `PlayerSeasonStat`
  - `playerId`
  - `season`
  - totals
  - averages
  - derived metric fields

## 11. Technical Requirements

Recommended stack:

- React
- TypeScript
- Vite or Next.js
- shadcn/ui
- Tailwind CSS
- TanStack Table for rich sortable tables
- Recharts or Tremor-style charts for trends
- Server-side API layer for BBAPI calls
- XML parser for BBAPI responses
- Lightweight local cache

If using Vite, include a small Node/Express or Hono server for BBAPI proxying. If using Next.js, use route handlers/server functions.

Architecture expectations:

- Keep BBAPI client code separate from UI code.
- Keep XML parsing in explicit adapter modules.
- Keep metric formulas in pure, unit-tested functions.
- Cache raw BBAPI responses and normalized data separately where useful.
- Avoid storing credentials in browser storage.

## 12. Caching and Refresh

MVP cache behavior:

- Cache team info and roster for 6 hours.
- Cache schedule for 1 hour.
- Cache finished box scores indefinitely unless manually refreshed.
- Cache current season team stats for 1 hour.
- Provide a manual refresh button that invalidates relevant cached data.

The UI should show the last successful refresh timestamp.

## 13. Error Handling

The app should handle:

- Invalid credentials.
- Expired BBAPI session.
- Unknown team, season, match, or player IDs.
- Box score not available yet.
- BBAPI server errors.
- XML parsing failures.
- Missing fields in older or unusual API responses.

Error display should be specific enough to guide action. For example, `BoxscoreNotAvailable` should appear as "Box score is not available yet" rather than a generic failure.

## 14. Privacy and Security

- Treat the read-only security code as a secret.
- Do not log credentials.
- Do not expose credentials to the frontend.
- Store cached data locally only.
- Assume this is a personal tool, but keep the boundary clean enough that it could later support multiple users.

## 15. MVP Acceptance Criteria

The MVP is complete when:

- The app can authenticate to BBAPI from server-side code.
- The app displays the current team name and selected season.
- The app displays the active roster.
- The app displays the season schedule with finished game results.
- The app fetches box scores for finished games.
- The app calculates MVP metrics listed in section 9.1.
- The Players view includes a sortable advanced stats table.
- The Games view includes a match list and per-game detail.
- The Overview view summarizes record, recent form, and team efficiency.
- The app handles `NotAuthorized`, `BoxscoreNotAvailable`, and `ServerError` gracefully.
- Metric formula functions have unit tests for normal inputs and zero-denominator cases.

## 16. Implementation Phases

### Phase 1: Foundation

- Set up React + TypeScript + shadcn/ui.
- Add server-side BBAPI client.
- Add XML parsing utilities.
- Add credential configuration via `.env.local`.
- Implement login/session retry behavior.

### Phase 2: Data Normalization

- Fetch team info, roster, schedule, team stats, and box scores.
- Normalize XML responses into typed entities.
- Add local cache.
- Add API routes consumed by the React app.

### Phase 3: Metrics

- Implement pure metric calculation functions.
- Add tests for formulas.
- Attach derived metrics to player, team, and game data.

### Phase 4: UI

- Build app shell.
- Build Overview, Players, Games, Trends, and Glossary views.
- Add table sorting/filtering and chart interactions.
- Add loading, empty, and error states.

### Phase 5: Polish

- Add manual refresh.
- Improve metric explanations.
- Validate calculations against sample games.
- Improve responsive layout.

## 17. Open Questions

- Should the first implementation use Vite plus a separate server, or Next.js route handlers?
- Which BBAPI XML fields are actually present for current BuzzerBeater box scores?
- Does BBAPI expose enough data to calculate all rebound and usage percentage metrics reliably?
- Should the app support second teams from the start?
- Should cached data be persisted to disk, SQLite, or in-memory only for MVP?

## 18. Recommended First Implementation Choice

Use Next.js with TypeScript, shadcn/ui, Tailwind CSS, TanStack Table, and Recharts. Next.js keeps the BBAPI credential boundary simple because API route handlers can call BBAPI server-side without introducing a separate backend service.

For storage, start with a local file or SQLite cache. If implementation speed matters most, begin with file-backed JSON cache and keep the cache interface abstract enough to replace with SQLite later.
