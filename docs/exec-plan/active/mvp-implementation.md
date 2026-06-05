# Build the BuzzerBeater Advanced Stats MVP

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must stay up to date as work proceeds.

If `PLANS.md` is present in the repo, maintain this document in accordance with it and link back to it by path: `PLANS.md`.

## Purpose / Big Picture

Build the first working version of BuzzerBeater Advanced Stats: a private dashboard that authenticates to BBAPI from server-side code, fetches the user's team, roster, schedule, team stats, and finished game box scores, calculates explainable basketball metrics, and presents the results in compact Overview, Players, Games, Trends, and Glossary views.

After this MVP is complete, a BuzzerBeater manager can start the app locally, provide `BB_LOGIN` and `BB_SECURITY_CODE` in `.env.local`, refresh data from BBAPI without exposing secrets to the browser, and answer practical questions such as which players are efficient, who carries offensive load, how recent games differ, and whether shooting, turnovers, rebounding, or pace are driving results.

The observable result is a Next.js web app with sortable tables, charts, useful empty/loading/error states, unit-tested metric formulas, and clear handling for BBAPI errors including `NotAuthorized`, `BoxscoreNotAvailable`, and `ServerError`.

## Progress

- [x] (2026-06-04 20:18Z) Read `PLANS.md`, `docs/prd/prd-mvp.md`, `docs/references/buzzerbeater-api.md`, and `docs/references/glossary.md`; confirmed `docs/exec-plan/active` was empty before creating this active MVP plan.
- [x] (2026-06-04 20:31Z) Phase 0: ran a redacted BBAPI discovery smoke test against live credentials; login captured a cookie, core endpoints returned HTTP 200, one finished-match box score was discovered, and logout returned HTTP 200.
- [x] (2026-06-05 05:15Z) Foundation started: scaffold the Next.js + TypeScript application, Tailwind CSS, shadcn/ui base components, linting, tests, and local environment file example.
- [x] (2026-06-05 05:17Z) Foundation scaffold files added: root Next/TypeScript/Tailwind/Vitest/ESLint configs, `components.json`, `.env.example`, app shell, shadcn-style base UI components, and an initial React render test.
- [x] (2026-06-05 05:27Z) Foundation validation completed: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` all exited 0; `npm run dev` served `http://localhost:3000` with HTTP 200 and rendered the title plus Overview and Players tabs.
- [x] (2026-06-05 05:33Z) Added root `README.md` with install, environment setup, dev up, dev down, validation, and BBAPI smoke test instructions.
- [x] (2026-06-05 05:43Z) Refactored `src\components\dashboard-tabs.tsx` so each tab panel's card content lives in its own component file before data wiring expands the UI.
- [x] (2026-06-05 06:00Z) Server boundary completed: added credential loading, BBAPI session login/logout, cookie preservation, retry-on-`NotAuthorized`, XML parsing, typed BBAPI errors, and secret-safe error messages with mocked request coverage.
- [x] (2026-06-05 17:31Z) Data normalization and cache completed: added typed domain entities, BBAPI XML adapters, redacted fixture parser tests, file-backed cache under `.cache\bbapi`, dashboard refresh/load orchestration, and route handlers for dashboard data, manual refresh, per-game box score lookup, and logout.
- [x] (2026-06-05 18:13Z) Metrics completed: added pure MVP metric formulas, player/game/team/trend derivation, low-sample and turnover pattern alerts, dashboard payload `derived` metrics, and unit tests for normal inputs, missing inputs, and zero-denominator behavior.
- [ ] UI: build the compact app shell, Overview, Players, Games, Trends, and Glossary views with tables, charts, filters, detail panels, loading states, empty states, and specific error messages.
- [ ] Validation: add unit tests, fixture-based parser tests, build checks, and a manual smoke-test transcript using real credentials that are never committed or logged.
- [ ] Retrospective: update this ExecPlan with final outcomes, gaps, and any post-MVP follow-ups discovered during implementation.

## Surprises & Discoveries

- Observation: The repository is currently documentation-only, with no `package.json`, application source, tests, or generated framework files.
  Evidence: `rg --files` on 2026-06-04 returned only `PLANS.md`, `LICENSE`, `AGENTS.md`, `docs/prd/prd-mvp.md`, and files under `docs/references`.
- Observation: `docs/exec-plan/active` existed but contained no active plan before this file was created.
  Evidence: `Get-ChildItem -Force -LiteralPath 'docs\exec-plan\active'` returned no entries on 2026-06-04.
- Observation: Exact BBAPI box score XML field names and edge cases have not yet been verified against live data.
  Evidence: `docs/references/buzzerbeater-api.md` explains endpoint purposes and errors but delegates exact XML structure to the RelaxNG schema and live endpoint responses.
- Observation: Phase 0 should run before app scaffolding because the largest early unknown is live BBAPI XML shape, not frontend implementation.
  Evidence: The PRD has endpoint and metric requirements, while `docs\references\buzzerbeater-api.md` does not include complete per-endpoint sample XML for adapters.
- Observation: The existing local `.env.local` uses `BB_LOGIN_NAME` and `BB_ACCESS_KEY`, not the PRD names `BB_LOGIN` and `BB_SECURITY_CODE`.
  Evidence: A redacted variable-name-only inspection printed `BB_ACCESS_KEY` and `BB_LOGIN_NAME`; `scripts\bbapi-smoke.ps1` now accepts those aliases for discovery while the MVP plan still standardizes on `BB_LOGIN` and `BB_SECURITY_CODE`.
- Observation: BBAPI login/session basics work with the current local credentials.
  Evidence: Phase 0 returned HTTP 200 for `login.aspx`, printed `Direct children: loggedIn`, and reported `Cookie captured: True`; `logout.aspx` returned HTTP 200 with `Direct children: loggedOut`.
- Observation: Live `teaminfo.aspx` shape is compact and attribute-heavy for ids.
  Evidence: Phase 0 returned root `bbapi`, direct child `team`, and element attributes `country(id)`, `league(id,level)`, `rival(id)`, and `team(id,retrieved)`.
- Observation: Live `roster.aspx` includes 12 player records in the current account and exposes player skills as elements, with some `pop` attributes on skill elements.
  Evidence: Phase 0 element counts included `age=12`, `firstName=12`, `lastName=12`, `bestPosition=12`, and attributes `player(id)`, `roster(retrieved,teamid)`, `freeThrow(pop)`, `passing(pop)`, and `stamina(pop)`.
- Observation: Live `schedule.aspx` includes match ids and start/type attributes, with scores represented as child `score` elements rather than match score attributes.
  Evidence: Phase 0 element counts included `match=35`, `homeTeam=35`, `awayTeam=35`, `teamName=70`, and `score=40`; element attributes included `match(id,start,type)` and `schedule(retrieved,season,teamid)`.
- Observation: Live `teamstats.aspx` in default mode exposes averages-style fields, not full shooting attempt totals.
  Evidence: Phase 0 element counts included `games=11`, `mpg=11`, `ppg=11`, `fgPerc=11`, `ftPerc=11`, `tpPerc=11`, `rpg=11`, `orpg=11`, `apg=11`, `spg=11`, `bpg=11`, `topg=11`, and `rating=11`.
- Observation: Live `boxscore.aspx` exposes player stat elements needed for MVP formulas, but field naming is mixed-case and position labels appear as element names.
  Evidence: Phase 0 box score counts included `fgm=19`, `fga=19`, `tpm=19`, `tpa=19`, `ftm=19`, `fta=19`, `oreb=19`, `reb=19`, `ast=19`, `stl=19`, `blk=19`, `to=19`, `pts=19`, uppercase `PF=38`, and position tags `PG=19`, `SG=19`, `SF=19`, `C=19`; element attributes included `player(id)` and `score(partials)`.
- Observation: Dependency install completed, but `npm audit` reports two moderate findings through Next.js' bundled PostCSS dependency.
  Evidence: `npm audit --json` on 2026-06-05 reported `next` via `postcss`, with `postcss` advisory `GHSA-qx2v-qp2m-jg93`; npm's available fix suggested downgrading `next` to `9.3.3`, so no force fix was applied during Milestone 1.
- Observation: The Browser plugin could not complete the visual smoke because its Node runtime failed to start in this Windows sandbox context.
  Evidence: Two attempts to open `http://localhost:3000` through the in-app Browser failed with `windows sandbox failed: spawn setup refresh`; local HTTP verification still returned status 200 and confirmed the app title plus Overview and Players content in the HTML.
- Observation: `next build` updated `tsconfig.json` to include generated development types.
  Evidence: The build output said Next.js added `.next/dev/types/**/*.ts` to `include`, and the checked-in `tsconfig.json` now contains that include entry.
- Observation: TypeScript's `NodeJS.ProcessEnv` is best modeled with an index-signature interface when injecting test env objects.
  Evidence: `npm run typecheck` initially rejected `Pick<NodeJS.ProcessEnv, ...>` and `Partial<Record<...>>` defaults for `process.env`; `src\server\bbapi\config.ts` now uses an optional-key interface with `[key: string]: string | undefined`, and `npm run typecheck` exits 0.
- Observation: `fast-xml-parser` represents plain repeated score nodes like `<score>88</score>` as string values, not records.
  Evidence: The first schedule adapter test returned `null` for both score values until `src\server\bbapi\adapters\xml-utils.ts` added `childValues` and `readXmlNumber`; `npm run test -- bbapi-adapters dashboard-data` then passed.
- Observation: Current box score fixtures and live discovery emphasize player rows more than reliable team-total rows, so team game metrics should be derivable from player totals.
  Evidence: `src\domain\derive-team-stats.ts` sums player stat rows for the user's team and opponent when available, falling back to explicit team stat nodes only when player totals are absent; `tests\dashboard-metrics.test.ts` validates ORtg, possessions, margin, and team summary from fixture player rows.

## Decision Log

- Decision: Use Next.js App Router with TypeScript for the MVP.
  Rationale: `docs/prd/prd-mvp.md` recommends Next.js because route handlers keep BBAPI credentials server-side without introducing a separate backend service.
  Date/Author: 2026-06-04 / Codex
- Decision: Use server route handlers and server-only modules for every BBAPI call; the browser receives normalized analytics data only, never `BB_SECURITY_CODE`, cookies, or raw login URLs.
  Rationale: The PRD explicitly requires keeping the read-only security code out of browser code and logs.
  Date/Author: 2026-06-04 / Codex
- Decision: Start with a file-backed JSON cache under a gitignored local cache directory and keep the cache behind an interface.
  Rationale: The PRD recommends local file or SQLite cache, and file-backed JSON is faster for the MVP while still allowing SQLite replacement later.
  Date/Author: 2026-06-04 / Codex
- Decision: Treat full individual ORtg/DRtg, PER, and Win Shares as post-MVP research; MVP implements team/game ORtg and DRtg plus the practical box-score metrics in PRD section 9.1.
  Rationale: `AGENTS.md` and the PRD both say to prefer practical explainable metrics first and keep exact individual advanced formulas post-MVP.
  Date/Author: 2026-06-04 / Codex
- Decision: Every percentage or rate formula with a zero denominator returns `null`, not `0`.
  Rationale: PRD section 9.1 makes this a requirement, and `null` lets the UI distinguish unavailable data from a real zero.
  Date/Author: 2026-06-04 / Codex
- Decision: Build Overview, Players, Games, Trends, and Glossary for MVP, rather than deferring Trends or Glossary.
  Rationale: PRD section 8 lists all five as expected primary sections, and the MVP acceptance criteria require Overview, Players, and Games while the product goals require trend and metric explainability.
  Date/Author: 2026-06-04 / Codex
- Decision: Add Phase 0 as a checked-in PowerShell smoke script at `scripts\bbapi-smoke.ps1`, but do not write or commit raw BBAPI XML.
  Rationale: A tiny live discovery run de-risks adapter work while preserving the project's credential and privacy boundary.
  Date/Author: 2026-06-04 / Codex
- Decision: Let the Phase 0 smoke script accept local legacy aliases `BB_LOGIN_NAME` and `BB_ACCESS_KEY`, while the application implementation should still prefer `BB_LOGIN` and `BB_SECURITY_CODE`.
  Rationale: This lets discovery run immediately with the user's existing env file without weakening the PRD's server-side credential contract for the app.
  Date/Author: 2026-06-04 / Codex
- Decision: Scaffold shadcn-style local UI components manually instead of running the interactive shadcn CLI during Milestone 1.
  Rationale: The repo was docs-only, and a small checked-in base set (`Button`, `Card`, `Tabs`, `Table`, `Badge`, `Skeleton`) was enough to validate the foundation while avoiding generator churn before the app architecture exists.
  Date/Author: 2026-06-05 / Codex
- Decision: Do not run `npm audit fix --force` for the moderate PostCSS advisory during Milestone 1.
  Rationale: npm's suggested fix was a major downgrade of Next.js, while the current scaffold builds and this is a private local MVP; revisit after Next publishes a version with a non-vulnerable bundled PostCSS.
  Date/Author: 2026-06-05 / Codex
- Decision: Keep the BBAPI client fetch-injectable and store credentials/cookies in ECMAScript private fields.
  Rationale: Injecting `fetch` lets tests prove login retry and cookie behavior without network access or real credentials, while private fields keep the client object from serializing secrets or cookies into accidental browser-visible JSON.
  Date/Author: 2026-06-05 / Codex
- Decision: Cache normalized dashboard data for 15 minutes, cache ordinary raw parsed endpoint documents for 15 minutes, and cache finished box score documents for 7 days.
  Rationale: Team, roster, schedule, and team stat pages can change during a session, while finished box scores are stable enough to reuse much longer in a local MVP cache.
  Date/Author: 2026-06-05 / Codex
- Decision: Use redacted synthetic XML fixtures for adapter tests instead of persisting live BBAPI XML.
  Rationale: The adapter behavior needs regression coverage, but live team names, player names, match ids, cookies, and credentials should stay out of git.
  Date/Author: 2026-06-05 / Codex
- Decision: Attach derived metrics directly to the normalized dashboard payload as `derived` instead of creating a separate metrics route.
  Rationale: The MVP UI needs player, game, team, trend, and alert summaries together with the normalized data, and keeping one cacheable dashboard payload avoids duplicate BBAPI refresh orchestration.
  Date/Author: 2026-06-05 / Codex
- Decision: Season-level percentage and factor summaries are averages of available game-level metrics for now.
  Rationale: This keeps null handling honest when some box score fields are unavailable, while still giving the UI a stable summary; exact weighted season factors can be revisited if live team-total fields prove complete.
  Date/Author: 2026-06-05 / Codex

## Outcomes & Retrospective

Current outcome: this active ExecPlan now describes how to implement and validate the MVP from the original docs-only repository state, Phase 0 has confirmed that the current local credentials can authenticate to BBAPI and fetch the core MVP endpoint shapes, Milestone 1 has produced a working Next.js foundation, and Milestone 2 has added the server-side BBAPI boundary.

Milestone 1 outcome: the repository now has `package.json`, `package-lock.json`, Next.js 16, React 19, TypeScript, Tailwind CSS, ESLint, Vitest, a local `.env.example`, shadcn-style base components, and a static compact dashboard shell. Remaining gaps are BBAPI integration, data adapters, metric library, real dashboard data, cache, richer UI behavior, and final live smoke validation inside the app. Adapter work should start from the Phase 0 findings in Surprises & Discoveries, especially schedule score child elements, teamstats averages fields, and mixed-case box score stat names.

Milestone 2 outcome: `src\server\bbapi` now contains typed config, endpoint URL construction, XML parsing and BBAPI error detection, typed application errors, and a session client that logs in, stores cookies internally, logs out, and retries exactly once after `NotAuthorized`. `tests\bbapi-client.test.ts` and `tests\fixtures\bbapi\error-not-authorized.xml` validate the boundary with mocked responses only. Remaining gaps are the Milestone 3 adapters, cache, orchestration, and route handlers that will consume this server client.

Milestone 3 outcome: `src\domain\types.ts` defines the MVP team, player, match, season stat, game stat, team game stat, box score, and normalized dashboard entities. `src\server\bbapi\adapters` parses `teaminfo.aspx`, `roster.aspx`, `schedule.aspx`, `teamstats.aspx`, and `boxscore.aspx` documents into those entities, including schedule score child nodes and mixed-case player stat fields such as `PF`. `src\server\cache` provides the file-backed `.cache\bbapi` cache, and `src\server\data` now loads from normalized cache or refreshes BBAPI pages and finished box scores before logging out. Route handlers exist at `/api/dashboard`, `/api/refresh`, `/api/games/[matchId]`, and `/api/logout`. Remaining gaps are metric derivation, UI data consumption, richer error-state tests, and live app smoke validation through the new routes.

Milestone 4 outcome: `src\domain\metrics.ts` now implements safe ratio handling plus FG%, 2P%, 3P%, FT%, eFG%, TSA, TS%, TOV%, Game Score, estimated possessions, ORtg, and DRtg, returning `null` for zero denominators and missing inputs. `src\domain\aggregate.ts`, `derive-player-stats.ts`, `derive-team-stats.ts`, and `derive-trends.ts` attach UI-ready `derived` summaries to every refreshed dashboard payload, including player advanced summaries, team game metrics, season summaries, trend points, rolling averages when sample size allows, and low-sample/turnover alerts. Remaining gaps are UI rendering of these metrics, glossary content for implemented formulas, UI behavior tests, and live route smoke validation.

Update this section at every meaningful stopping point. At completion, summarize what works in the running app, which acceptance criteria were verified, which BBAPI data limitations remain, and which items should move into post-MVP work.

## Context and Orientation

The working directory is `buzzerbeater-advanced-stats`.

The repository currently contains planning and reference documentation only. The implementation will create the application from scratch while preserving existing docs:

- `PLANS.md` defines the ExecPlan format and living-document requirements.
- `AGENTS.md` defines project-specific implementation guidance.
- `docs\prd\prd-mvp.md` is the MVP source of truth.
- `docs\references\buzzerbeater-api.md` describes BBAPI pages, authentication flow, XML behavior, UTC dates, and error types.
- `docs\references\glossary.md` defines basketball terms and metric formulas.
- `docs\references\individual-ORtg-DRtg.md`, `win-shares.md`, and `calculating-PER.md` are post-MVP references unless the PRD changes.

BBAPI is the BuzzerBeater API. It exposes XML pages at `http://bbapi.buzzerbeater.com/`. A normal session starts with `login.aspx?login=<login>&code=<securityCode>`, receives an authentication cookie, uses that cookie for later pages, and ends with `logout.aspx`. The MVP must use these pages:

- `login.aspx` for authentication.
- `logout.aspx` for explicit session end.
- `teaminfo.aspx` for current team identity.
- `roster.aspx` for current player metadata.
- `schedule.aspx` for season matches and finished scores.
- `boxscore.aspx?matchid=<id>` for finished game box scores.
- `teamstats.aspx` for season player averages and totals.

Nice-to-have pages that should not block MVP completion are `standings.aspx`, `seasons.aspx`, and `player.aspx`. `pbp.aspx` is post-MVP because it may be Supporter-only.

The first implementation uses local environment variables, read only by server-side code:

- `BB_LOGIN`: BuzzerBeater login name.
- `BB_SECURITY_CODE`: read-only BBAPI security code.
- `BB_SECOND_TEAM`: optional string; set to `1` to access a second team.

Definitions used in this plan:

- Server boundary: the line between trusted server code and browser code. BBAPI credentials and cookies must stay on the server side of this boundary.
- XML adapter: code that converts BBAPI XML into typed TypeScript objects.
- Domain entity: an app-level object such as `Team`, `Player`, `Match`, `PlayerGameStat`, `TeamGameStat`, or `PlayerSeasonStat`.
- Raw cache: saved BBAPI XML responses, keyed by endpoint and parameters.
- Normalized cache: saved parsed domain data and derived summaries.
- TTL: time to live, or how long cached data is considered fresh before refetching.
- Four factors: shooting efficiency, turnovers, offensive rebounding, and free throw rate. In MVP these are represented by eFG%, TOV%, ORB% when source data allows, and FT rate.
- Possessions: an estimate of the number of team scoring opportunities. MVP starts with `FGA + 0.44 * FTA - ORB + TOV`.

The MVP metric formulas are:

- FG% = `FG / FGA`.
- 2P% = `2P / 2PA`.
- 3P% = `3P / 3PA`.
- FT% = `FT / FTA`.
- eFG% = `(FG + 0.5 * 3P) / FGA`.
- TSA = `FGA + 0.44 * FTA`.
- TS% = `PTS / (2 * TSA)`.
- TOV% = `100 * TOV / (FGA + 0.44 * FTA + TOV)`.
- Game Score = `PTS + 0.4*FG - 0.7*FGA - 0.4*(FTA-FT) + 0.7*ORB + 0.3*DRB + STL + 0.7*AST + 0.7*BLK - 0.4*PF - TOV`.
- Estimated possessions = `FGA + 0.44*FTA - ORB + TOV` unless a more complete opponent-aware formula is possible from parsed box scores.
- Team/game ORtg = `100 * PTS / possessions`.
- Team/game DRtg = `100 * Opp PTS / possessions`.
- Pace = possessions per game, normalized if reliable minutes are available.

Conditional metrics should be implemented only when required fields are available:

- Usage% requires player minutes and team minutes.
- AST% requires player minutes and team field goals.
- ORB%, DRB%, and TRB% require opponent rebound data.

Every percentage function must return `null` when the denominator is zero, missing, or not reliable.

## Milestones

Milestone 0, BBAPI discovery smoke test: run `scripts\bbapi-smoke.ps1` using `.env.local`, authenticate to BBAPI, capture an authentication cookie, request `teaminfo.aspx`, `roster.aspx`, `schedule.aspx`, `teamstats.aspx`, and one `boxscore.aspx` for a finished match if a candidate can be detected. This milestone is complete when the script prints only redacted endpoint status, root tags, direct child tags, element counts, BBAPI error messages if any, and whether a cookie was captured. It must not print credentials, cookie values, login URLs containing `code`, raw private XML, team names, player names, or match IDs.

Milestone 1, Foundation: create a Next.js + TypeScript app in the current repository, install the MVP libraries, add formatting/lint/test scripts, create `.env.example`, and render a placeholder dashboard shell. This milestone is complete when `npm run lint`, `npm run test`, `npm run build`, and `npm run dev` all work, and the browser shows the app shell without needing BBAPI credentials.

Milestone 2, Server BBAPI client: add server-only configuration, session login, cookie preservation, typed request methods, XML error detection, logout, and retry-on-`NotAuthorized`. This milestone is complete when fixture tests and mocked request tests prove that credentials are never returned to client code, `NotAuthorized` triggers exactly one relogin retry, and BBAPI error XML becomes typed application errors.

Milestone 3, Data model, adapters, and cache: define typed domain entities, parse team info, roster, schedule, team stats, and box score XML, cache raw XML and normalized data, and expose route handlers for dashboard data and refresh. This milestone is complete when fixture tests parse representative XML into normalized entities, finished games can fetch or reuse cached box scores, and cache TTL behavior matches the PRD.

Milestone 4, Metrics and aggregation: implement the metric library, derive per-player, per-team, per-game, and season summaries, and add low-sample and pattern alerts. This milestone is complete when unit tests cover normal inputs, missing inputs, and zero denominators for every MVP formula, and route handler output contains derived metrics ready for UI rendering.

Milestone 5, MVP UI: replace the placeholder shell with compact Overview, Players, Games, Trends, and Glossary views using shadcn/ui, TanStack Table, and Recharts. This milestone is complete when a user can sort and filter players, inspect a finished game, view recent trends, search formulas in the Glossary, trigger manual refresh, and see specific error and empty states.

Milestone 6, Final validation and documentation: run automated checks, build production output, smoke-test against live BBAPI credentials, verify no secrets appear in browser payloads or logs, and update this plan. This milestone is complete when the MVP acceptance criteria in `docs\prd\prd-mvp.md` section 15 have recorded evidence in this ExecPlan.

## Plan of Work

Run Phase 0 before scaffolding the app. Use the checked-in script `scripts\bbapi-smoke.ps1`, which reads `BB_LOGIN`, `BB_SECURITY_CODE`, and optional `BB_SECOND_TEAM` from `.env.local`, preserves the BBAPI session cookie in memory, prints redacted structural XML summaries, and logs out at the end. Use the findings to update Surprises & Discoveries, adapter expectations, and the later fixture strategy. Keep raw XML out of git unless a future fixture is manually redacted.

Start by adding the application scaffold at the repository root. Create `package.json`, Next.js configuration, TypeScript configuration, Tailwind CSS configuration, PostCSS configuration, ESLint configuration, the `src` directory, and a minimal app route. Install runtime dependencies for Next.js, React, shadcn/ui-compatible Radix components, TanStack Table, Recharts, XML parsing, class name utilities, and local server helpers. Install development dependencies for TypeScript, ESLint, Vitest, React Testing Library, jsdom, and Tailwind tooling.

Add `.gitignore` entries for `node_modules`, `.next`, `.env.local`, local cache files, coverage output, and temporary artifacts. Add `.env.example` with the required BBAPI variables but no real credentials.

Create the server-only BBAPI layer under `src\server\bbapi`. `config.ts` loads and validates `BB_LOGIN`, `BB_SECURITY_CODE`, and `BB_SECOND_TEAM`. `client.ts` implements login, logout, cookie capture, page requests, one retry after `NotAuthorized`, and safe URL construction. `errors.ts` defines typed BBAPI error classes. `xml.ts` uses `fast-xml-parser` or an equivalent XML parser to parse documents and detect `<error message="..."/>` responses before adapters consume data. No server module may log credentials, full BBAPI URLs containing `code`, or cookie values.

Create XML adapters under `src\server\bbapi\adapters`. Keep them explicit and typed: one module per source page, with small helpers for numeric, date, boolean, and optional field parsing. Because live field names may vary by BBAPI response, write adapters defensively, keep fixture tests close to adapters, and record unexpected live fields in Surprises & Discoveries.

Create the domain model under `src\domain`. `types.ts` defines `Team`, `Season`, `Player`, `Match`, `PlayerGameStat`, `TeamGameStat`, and `PlayerSeasonStat`. `metrics.ts` contains pure formula functions with no fetch, cache, React, or filesystem imports. `aggregate.ts` combines normalized BBAPI data into view models for Overview, Players, Games, Trends, and Glossary.

Create the cache layer under `src\server\cache`. Define a small `CacheStore` interface with `get`, `set`, `delete`, and `clearByPrefix`. Implement `FileCacheStore` with JSON files under a gitignored local cache directory such as `.cache\bbapi`. Cache team info and roster for 6 hours, schedule for 1 hour, current season team stats for 1 hour, and finished box scores indefinitely unless manual refresh invalidates them.

Create route handlers under `src\app\api`. `api\dashboard\route.ts` returns the combined MVP dashboard payload. `api\refresh\route.ts` invalidates relevant cache keys and refetches. `api\games\[matchId]\route.ts` returns a game detail payload if the main dashboard payload should stay smaller. `api\logout\route.ts` explicitly ends the BBAPI session when requested. Route responses should use stable JSON shapes and convert typed BBAPI failures into UI-friendly status codes and messages.

Build the UI in `src\app` and `src\components`. The first screen should be the usable dashboard, not a marketing page. Use a compact top bar with team name, selected season, last refresh, and a manual refresh button. Use tabs or a left nav for Overview, Players, Games, Trends, and Glossary. Keep the interface dense enough for repeated analysis while preserving clear spacing and responsive behavior.

For the Players view, use TanStack Table with sorting, filters for active roster, minimum games, and minimum minutes, and column visibility controls. Include player name, position, age, games, minutes, base box score totals or averages, shooting percentages, eFG%, TS%, Usage%, AST%, rebound percentages, TOV%, Game Score, and per-minute or per-36 rates when source fields allow.

For the Games view, show the schedule with opponent, date, result, score, match type, and box score status. The detail view should show team score comparison, player box score table, four factors for both teams when data allows, Game Score by player, and estimated possessions or pace.

For the Trends view, use Recharts to display recent games for team points, opponent points, margin, estimated possessions, ORtg, and DRtg. Include a player trend chart that changes with selected player and metric. Rolling averages over the last 3, 5, and 10 games should appear only when enough data exists.

For the Glossary view, create a searchable list of implemented metrics, formulas, interpretation notes, and data availability notes. Do not include formulas for post-MVP metrics as implemented behavior unless they are actually calculated in the app.

Add tests as each layer appears. Metric tests are mandatory. Parser tests should use fixtures under `tests\fixtures\bbapi`. Client tests should mock fetch responses for login, cookie capture, `NotAuthorized`, `BoxscoreNotAvailable`, and `ServerError`. UI tests should focus on high-value behavior: sorting/filtering visible rows, error message rendering, and empty states. Use manual browser smoke testing after significant frontend work.

## Concrete Steps

All commands below run from `buzzerbeater-advanced-stats` unless stated otherwise.

1.  Run Phase 0 BBAPI discovery before app scaffolding:

        powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bbapi-smoke.ps1

    Expected output: endpoint-level status, XML root tags, direct child tags, element counts, BBAPI error messages if present, and `Cookie captured: True` after login. The output must not include `BB_SECURITY_CODE`, cookie values, raw XML, player names, team names, or match IDs. If no finished match candidate is detected, box score discovery remains incomplete and this plan should record that as a gap.

2.  Check the current worktree before editing:

        git status --short
        rg --files

    Expected output at the start of implementation is a docs-only tree plus this active plan. If unrelated user changes appear, preserve them.

3.  Create the Next.js foundation by adding or generating these root files:

        package.json
        package-lock.json
        next.config.ts
        tsconfig.json
        postcss.config.mjs
        tailwind.config.ts
        eslint.config.mjs
        vitest.config.ts
        components.json
        .gitignore
        .env.example

    If using generators, ensure they do not remove `docs`, `PLANS.md`, `AGENTS.md`, or `LICENSE`. If a generator refuses to run in a non-empty directory, create the scaffold files manually or generate into a temporary directory and copy only the required scaffold files back into this repository.

4.  Install dependencies:

        npm install next react react-dom fast-xml-parser zod @tanstack/react-table recharts class-variance-authority clsx tailwind-merge lucide-react
        npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tailwindcss postcss autoprefixer

    Expected result: `package.json` and `package-lock.json` record the dependencies, and no credentials are requested during installation.

5.  Initialize shadcn/ui for the local component system:

        npx shadcn@latest init
        npx shadcn@latest add button card table tabs dropdown-menu sheet input label select checkbox skeleton alert tooltip scroll-area badge separator

    Use the repo's Tailwind and TypeScript paths. If the CLI changes file names, record the generated paths in this plan.

6.  Add the first app shell:

        src\app\layout.tsx
        src\app\page.tsx
        src\app\globals.css
        src\components\app-shell.tsx
        src\components\dashboard-tabs.tsx
        src\lib\utils.ts

    Expected result: `npm run dev` serves a compact dashboard shell at `http://localhost:3000`.

7.  Add server configuration and BBAPI client modules:

        src\server\config.ts
        src\server\bbapi\client.ts
        src\server\bbapi\errors.ts
        src\server\bbapi\xml.ts
        src\server\bbapi\endpoints.ts

    Expected behavior: missing `BB_LOGIN` or `BB_SECURITY_CODE` yields a typed configuration error on server routes, not a build-time crash for static UI tests.

8.  Add domain types and XML adapters:

        src\domain\types.ts
        src\server\bbapi\adapters\team-info.ts
        src\server\bbapi\adapters\roster.ts
        src\server\bbapi\adapters\schedule.ts
        src\server\bbapi\adapters\team-stats.ts
        src\server\bbapi\adapters\boxscore.ts
        src\server\bbapi\adapters\parse-helpers.ts

    Expected behavior: each adapter accepts parsed XML and returns typed entities or typed parse errors with source endpoint context.

9.  Add fixture tests for adapters:

        tests\fixtures\bbapi\teaminfo.xml
        tests\fixtures\bbapi\roster.xml
        tests\fixtures\bbapi\schedule.xml
        tests\fixtures\bbapi\teamstats.xml
        tests\fixtures\bbapi\boxscore.xml
        tests\bbapi-adapters.test.ts

    Expected result: `npm run test -- bbapi-adapters` passes using fixtures without network access.

10. Add cache and data orchestration:

    src\server\cache\cache-store.ts
    src\server\cache\file-cache-store.ts
    src\server\cache\cache-keys.ts
    src\server\data\load-dashboard-data.ts
    src\server\data\refresh-dashboard-data.ts

Expected behavior: cache files are written only under `.cache\bbapi`, and `.cache` is ignored by git.

11. Add metric functions and tests:

    src\domain\metrics.ts
    src\domain\derive-player-stats.ts
    src\domain\derive-team-stats.ts
    src\domain\derive-trends.ts
    tests\metrics.test.ts

Expected result:

       npm run test -- metrics

passes with normal cases, zero-denominator cases, and missing-field cases.

12. Add API route handlers:

    src\app\api\dashboard\route.ts
    src\app\api\refresh\route.ts
    src\app\api\games\[matchId]\route.ts
    src\app\api\logout\route.ts
    src\lib\api-types.ts

Expected behavior: route responses include typed success and typed error shapes. Browser-visible errors are specific, for example "Box score is not available yet" for `BoxscoreNotAvailable`.

13. Build the Overview UI:

    src\components\overview\overview-view.tsx
    src\components\overview\record-summary.tsx
    src\components\overview\four-factors.tsx
    src\components\overview\top-players.tsx
    src\components\overview\alerts.tsx

Expected behavior: with loaded data, Overview shows team identity, selected season, record, recent games, four-factor profile, top players, and notable pattern alerts.

14. Build the Players UI:

    src\components\players\players-view.tsx
    src\components\players\player-table.tsx
    src\components\players\player-detail-sheet.tsx
    src\components\players\player-filters.tsx
    src\components\players\columns.tsx

Expected behavior: the player table sorts, filters, toggles columns, and opens a player detail sheet with season summary and game log.

15. Build the Games UI:

    src\components\games\games-view.tsx
    src\components\games\schedule-table.tsx
    src\components\games\game-detail.tsx
    src\components\games\team-comparison.tsx
    src\components\games\player-box-score.tsx

Expected behavior: users can scan finished and upcoming matches, see box score availability, and inspect why a finished game was won or lost.

16. Build the Trends and Glossary UI:

    src\components\trends\trends-view.tsx
    src\components\trends\team-trend-chart.tsx
    src\components\trends\player-trend-chart.tsx
    src\components\trends\rolling-averages.tsx
    src\components\glossary\glossary-view.tsx
    src\components\glossary\metric-search.tsx
    src\domain\glossary.ts

Expected behavior: charts render for available data, rolling averages are hidden or marked unavailable when sample size is too small, and glossary search finds implemented metrics.

17. Add UI tests for key behavior:

    tests\players-view.test.tsx
    tests\games-view.test.tsx
    tests\error-states.test.tsx

Expected result: tests prove the UI can render populated, loading, empty, and known-error states.

18. Run full automated validation:

    npm run lint
    npm run test
    npm run build

Expected results:

       npm run lint exits 0 with no lint errors.
       npm run test exits 0 with all test files passing.
       npm run build exits 0 and produces a production Next.js build.

19. Run local smoke validation with real credentials kept outside git:

    Copy-Item .env.example .env.local
    notepad .env.local
    npm run dev

Fill `.env.local` manually with `BB_LOGIN` and `BB_SECURITY_CODE`. Do not paste credentials into this ExecPlan, terminal transcripts, tests, fixtures, or logs.

Expected behavior at `http://localhost:3000`: the app displays current team name, selected season, active roster, season schedule, finished game box scores, derived metrics, Overview, Players, Games, Trends, Glossary, refresh status, and a working manual refresh action.

20. Inspect browser and server payloads for secret leakage:

    rg "BB_SECURITY_CODE|code=|Set-Cookie|Cookie:" src tests docs package.json .env.example

Expected result: code may refer to variable names in server-only modules and docs, but no real security code, cookie value, or full login URL with secret appears. Browser network responses must not include the security code or BBAPI cookie.

21. Update this ExecPlan:

    docs\exec-plan\active\mvp-implementation.md

Mark completed progress items, add discoveries and decisions, paste concise validation evidence, and update Outcomes & Retrospective.

## Validation and Acceptance

The MVP is accepted only when all of these observable behaviors are true:

- Phase 0 BBAPI discovery has either succeeded against live BBAPI or recorded a concrete blocker, and the plan includes redacted evidence of what endpoint shapes were observed.

- The app authenticates to BBAPI from server-side code using `BB_LOGIN`, `BB_SECURITY_CODE`, and optional `BB_SECOND_TEAM`.
- The browser never receives the security code, BBAPI cookie, or a login URL containing the code.
- The app displays the current team name and selected season.
- The app displays the active roster.
- The app displays the season schedule with finished game results.
- The app fetches or reuses cached box scores for finished games.
- The app calculates the MVP metrics from PRD section 9.1: FG%, 2P%, 3P%, FT%, eFG%, TSA, TS%, TOV%, Game Score, estimated possessions, team/game ORtg, team/game DRtg, and pace where reliable.
- Percentage metrics return `null` rather than `0` when denominator data is zero, missing, or unavailable.
- Conditional metrics from PRD section 9.2 appear only when required source data exists, and unavailable metrics are clearly marked in the UI.
- The Players view includes a sortable advanced stats table with filters for active roster, minimum games, and minimum minutes.
- The Games view includes a match list and per-game detail for finished games.
- The Overview view summarizes record, recent form, team efficiency, top players, and simple alerts.
- The Trends view shows recent game charts and player metric trends when enough game data exists.
- The Glossary view explains implemented metric formulas and data availability notes.
- The app handles `NotAuthorized`, `BoxscoreNotAvailable`, and `ServerError` with specific user-facing messages.
- Metric formula functions have unit tests for normal inputs and zero-denominator cases.

Required automated commands and expected outputs:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bbapi-smoke.ps1
    Expected: exits 0 with redacted endpoint structure and no secrets, or records a specific BBAPI/network/auth blocker in this plan.

    npm run lint
    Expected: exits 0.

    npm run test
    Expected: exits 0; metric tests include zero-denominator cases.

    npm run build
    Expected: exits 0; no client bundle contains BBAPI credentials.

Required manual checks:

    npm run dev
    Open http://localhost:3000.
    Expected: dashboard loads with real team data when .env.local contains valid credentials.

    Trigger manual refresh.
    Expected: refresh status updates, relevant cache entries invalidate, and data reloads without exposing secrets.

    Temporarily use invalid credentials in .env.local.
    Expected: UI shows a specific authorization message and server retries login once before returning the error.

    Inspect a scheduled but unfinished match.
    Expected: UI says the box score is not available yet instead of showing a generic failure.

## Idempotence and Recovery

All implementation steps should be safe to repeat. `npm install` can be rerun after package changes. Tests and builds can be rerun at any time. Cache files under `.cache\bbapi` are local derived artifacts and may be deleted if they become stale or malformed; deletion should cause the next refresh to fetch and rebuild cache data.

Do not remove or rewrite existing documentation unless the PRD changes. Do not commit `.env.local`, real BBAPI credentials, BBAPI cookies, or live raw XML that includes private user data. If fixture XML is created from live BBAPI responses, redact private values first and record the redaction in the fixture comments or fixture README.

If BBAPI field names differ from the assumptions in the adapters, update the affected adapter and fixture together, then record the discrepancy in Surprises & Discoveries. If a conditional metric lacks required source data, return `null`, show an availability note in the UI, and keep the app usable.

If the shadcn/ui CLI or Next.js generator creates files that conflict with existing repo files, stop before overwriting user-authored content. Prefer adding missing files manually or generating into a temporary directory and copying only reviewed files into the workspace.

If live BBAPI is unavailable or returns `ServerError`, continue validating with fixtures and mocked responses. Record the outage in Surprises & Discoveries and do not mark live smoke validation complete until a later successful run.

If a change introduces a failing build, first inspect the failing file and the smallest related diff. Revert only changes made for this MVP work, never unrelated user changes.

## Artifacts and Notes

Initial repository inspection on 2026-06-04:

    rg --files
    PLANS.md
    LICENSE
    AGENTS.md
    docs\references\win-shares.md
    docs\references\individual-ORtg-DRtg.md
    docs\references\glossary.md
    docs\references\calculating-PER.md
    docs\references\buzzerbeater-api.md
    docs\prd\prd-mvp.md

Active plan directory inspection on 2026-06-04:

    Get-ChildItem -Force -LiteralPath 'docs\exec-plan\active'
    Expected and observed before this file: no entries.

BBAPI error XML shape from `docs\references\buzzerbeater-api.md`:

    <?xml version='1.0' encoding='utf-8'?>
    <bbapi version='1'>
        <error message='ErrorType'/>
    </bbapi>

The BBAPI base URL is `http://bbapi.buzzerbeater.com/`. The implementation should centralize this value in a server-only endpoint module so tests can substitute mocked responses.

Phase 0 smoke script added on 2026-06-04:

    scripts\bbapi-smoke.ps1

It reads `.env.local`, calls BBAPI with an in-memory web session, prints redacted XML shape summaries, attempts one finished-match box score request, and logs out. It intentionally does not persist raw XML.

Phase 0 redacted result on 2026-06-04:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bbapi-smoke.ps1
    BBAPI smoke test started. Secrets and cookies are intentionally not printed.
    login.aspx: HTTP 200, root bbapi, direct child loggedIn, cookie captured True.
    teaminfo.aspx: HTTP 200, direct child team; attributes include country(id), league(id,level), rival(id), team(id,retrieved).
    roster.aspx: HTTP 200, direct child roster; 12 players observed; attributes include player(id), roster(retrieved,teamid), and skill pop attributes.
    schedule.aspx: HTTP 200, direct child schedule; 35 matches, 40 score elements, match(id,start,type).
    teamstats.aspx: HTTP 200, direct child teamStats; 11 player stat rows with games, mpg, ppg, percentages, rebounds, assists, steals, blocks, turnovers, fouls, and rating fields.
    boxscore.aspx: HTTP 200 for one redacted finished match id; direct child match; player stat elements include fgm, fga, tpm, tpa, ftm, fta, oreb, reb, ast, stl, blk, to, pts, PF, and position tags.
    logout.aspx: HTTP 200, direct child loggedOut.
    BBAPI smoke test finished.

Milestone 1 validation on 2026-06-05:

    node --version
    v24.15.0

    npm --version
    11.12.1

    npm run lint
    Expected and observed: exited 0.

    npm run typecheck
    Expected and observed: exited 0.

    npm run test
    Expected and observed: 1 test file passed, 1 test passed.

    npm run build
    Expected and observed: exited 0; route `/` prerendered as static content.

    npm run dev
    Expected and observed: local server answered HTTP 200 at `http://localhost:3000`.

    Invoke-WebRequest -Uri 'http://localhost:3000'
    Expected and observed: response HTML contained `BuzzerBeater Advanced Stats`, `Overview`, and `Players`.

Milestone 1 browser check note:

    In-app Browser verification was attempted twice after the dev server started, but the Browser plugin's Node runtime failed with `windows sandbox failed: spawn setup refresh`. This did not block Milestone 1 because lint, typecheck, tests, production build, and local HTTP content checks passed. Reattempt Browser verification after the local sandbox issue is resolved or when doing richer frontend work.

Milestone 2 validation on 2026-06-05:

    npm run test -- bbapi-client
    Expected and observed: 1 test file passed, 8 tests passed.

    npm run lint
    Expected and observed: exited 0.

    npm run typecheck
    Expected and observed: exited 0.

    npm run test
    Expected and observed: 2 test files passed, 9 tests passed.

    npm run build
    Expected and observed: exited 0; route `/` prerendered as static content.

Milestone 2 mocked behavior evidence:

    tests\bbapi-client.test.ts validates that public config status omits credential values, missing server credentials throw `ConfigurationError` without echoing the provided secret, BBAPI `<error message="NotAuthorized" />` XML throws a typed `BbapiError`, login cookies are sent on later page requests, `NotAuthorized` causes exactly one fresh login and one retry, and HTTP failure messages do not include `BB_SECURITY_CODE`.

Milestone 3 validation on 2026-06-05:

    npm run test -- bbapi-adapters dashboard-data
    Expected and observed: 2 test files passed, 7 tests passed.

    npm run lint
    Expected and observed: exited 0 with no warnings after removing one unused type import.

    npm run typecheck
    Expected and observed: exited 0.

    npm run test
    Expected and observed: 4 test files passed, 16 tests passed.

    npm run build
    Expected and observed: exited 0; dynamic server routes were produced for `/api/dashboard`, `/api/games/[matchId]`, `/api/logout`, and `/api/refresh`.

Milestone 3 mocked behavior evidence:

    tests\bbapi-adapters.test.ts validates redacted `teaminfo`, `roster`, `schedule`, `teamstats`, and `boxscore` XML adapters, including plain score child nodes and mixed-case `PF` foul tags. `tests\dashboard-data.test.ts` validates that fresh normalized cache avoids BBAPI calls and that refresh fetches the core pages plus one finished box score, writes normalized cache, and logs out.

Milestone 4 validation on 2026-06-05:

    npm run test -- metrics dashboard-metrics dashboard-data
    Expected and observed: 3 test files passed, 7 tests passed.

    npm run typecheck
    Expected and observed: exited 0.

    npm run lint
    Expected and observed: exited 0.

    npm run test
    Expected and observed: 6 test files passed, 21 tests passed.

    npm run build
    Expected and observed: exited 0; dynamic server routes remained `/api/dashboard`, `/api/games/[matchId]`, `/api/logout`, and `/api/refresh`.

Milestone 4 mocked behavior evidence:

    tests\metrics.test.ts covers every MVP formula for normal inputs, missing inputs, and zero-denominator behavior. `tests\dashboard-metrics.test.ts` validates player summaries, Game Score, team possessions, ORtg, margin, season record, trends, and low-sample alerts from redacted fixtures. `tests\dashboard-data.test.ts` validates that refreshed dashboard data now includes derived player and game metrics.

## Interfaces and Dependencies

Runtime dependencies expected by the MVP:

- `next`, `react`, and `react-dom` for the app.
- `fast-xml-parser` for XML parsing.
- `zod` for environment and response validation where useful.
- `@tanstack/react-table` for Players and Games tables.
- `recharts` for Trends charts.
- `lucide-react` for UI icons.
- `class-variance-authority`, `clsx`, and `tailwind-merge` for shadcn/ui component styling.

Development dependencies expected by the MVP:

- `typescript`, `eslint`, and `eslint-config-next`.
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`.
- `tailwindcss`, `postcss`, and `autoprefixer`.

Stable domain interfaces to create in `src\domain\types.ts`:

    export interface Team {
      id: string;
      name: string;
      owner?: string | null;
      leagueId?: string | null;
    }

    export interface Player {
      id: string;
      name: string;
      position?: string | null;
      age?: number | null;
      height?: string | null;
      salary?: number | null;
      rosterStatus: "active" | "inactive" | "unknown";
    }

    export interface Match {
      id: string;
      season?: string | null;
      date: string;
      homeTeamId?: string | null;
      awayTeamId?: string | null;
      opponentName?: string | null;
      homeScore?: number | null;
      awayScore?: number | null;
      status: "scheduled" | "finished" | "unknown";
      type?: string | null;
    }

    export interface PlayerGameStat {
      matchId: string;
      playerId: string;
      minutes?: number | null;
      points?: number | null;
      fieldGoals?: number | null;
      fieldGoalAttempts?: number | null;
      twoPointMakes?: number | null;
      twoPointAttempts?: number | null;
      threePointMakes?: number | null;
      threePointAttempts?: number | null;
      freeThrows?: number | null;
      freeThrowAttempts?: number | null;
      offensiveRebounds?: number | null;
      defensiveRebounds?: number | null;
      totalRebounds?: number | null;
      assists?: number | null;
      steals?: number | null;
      blocks?: number | null;
      turnovers?: number | null;
      fouls?: number | null;
    }

Metric function signatures to create in `src\domain\metrics.ts`:

    export type NullableNumber = number | null;

    export function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined): NullableNumber;
    export function fieldGoalPercentage(makes: number | null | undefined, attempts: number | null | undefined): NullableNumber;
    export function effectiveFieldGoalPercentage(fieldGoals: number | null | undefined, threePointMakes: number | null | undefined, fieldGoalAttempts: number | null | undefined): NullableNumber;
    export function trueShootingAttempts(fieldGoalAttempts: number | null | undefined, freeThrowAttempts: number | null | undefined): NullableNumber;
    export function trueShootingPercentage(points: number | null | undefined, fieldGoalAttempts: number | null | undefined, freeThrowAttempts: number | null | undefined): NullableNumber;
    export function turnoverPercentage(turnovers: number | null | undefined, fieldGoalAttempts: number | null | undefined, freeThrowAttempts: number | null | undefined): NullableNumber;
    export function gameScore(input: GameScoreInput): NullableNumber;
    export function estimatedPossessions(input: PossessionInput): NullableNumber;
    export function offensiveRating(points: number | null | undefined, possessions: number | null | undefined): NullableNumber;
    export function defensiveRating(opponentPoints: number | null | undefined, possessions: number | null | undefined): NullableNumber;

Server BBAPI interface to create in `src\server\bbapi\client.ts`:

    export interface BbapiClient {
      login(): Promise<void>;
      logout(): Promise<void>;
      requestPage(endpoint: BbapiEndpoint, params?: Record<string, string | number | boolean | null | undefined>): Promise<unknown>;
    }

Cache interface to create in `src\server\cache\cache-store.ts`:

    export interface CacheStore {
      get<T>(key: string): Promise<T | null>;
      set<T>(key: string, value: T, options?: { ttlMs?: number | null }): Promise<void>;
      delete(key: string): Promise<void>;
      clearByPrefix(prefix: string): Promise<void>;
    }

Dashboard API response shape to create in `src\lib\api-types.ts`:

    export type DashboardApiResponse =
      | { ok: true; data: DashboardViewModel; refreshedAt: string; cacheStatus: CacheStatus }
      | { ok: false; error: { code: string; message: string; retryable: boolean } };

Keep these names stable unless implementation reveals a concrete reason to rename them. If they change, update this section and any dependent tests in the same work session.

## Revision Notes

2026-06-04 / Codex: Initial active ExecPlan created from `PLANS.md`, `docs\prd\prd-mvp.md`, `docs\references\buzzerbeater-api.md`, and `docs\references\glossary.md`.

2026-06-04 / Codex: Added Phase 0 BBAPI discovery smoke test before app scaffolding, including `scripts\bbapi-smoke.ps1`, acceptance criteria, and rerun command.

2026-06-04 / Codex: Ran Phase 0 successfully against live BBAPI with redacted output and updated Progress, Surprises & Discoveries, Decision Log, Outcomes, and Artifacts.

2026-06-05 / Codex: Completed Milestone 1 foundation scaffold and validation; recorded npm audit note and Browser plugin startup blocker.

2026-06-05 / Codex: Added a root README for installation, local development startup, shutdown, checks, and Phase 0 smoke testing.

2026-06-05 / Codex: Split dashboard tab panel content into separate component files and revalidated with lint, typecheck, tests, and production build.

2026-06-05 / Codex: Completed Milestone 2 server BBAPI client boundary with config loading, endpoint helpers, XML/error parsing, private session cookies, one `NotAuthorized` relogin retry, mocked tests, and full validation.

2026-06-05 / Codex: Completed Milestone 3 data normalization, local cache, dashboard orchestration, API route handlers, redacted adapter fixtures, mocked orchestration tests, and full validation.

2026-06-05 / Codex: Completed Milestone 4 metric formulas, dashboard metric aggregation, trend and alert derivation, derived API payload wiring, metric tests, aggregation tests, and full validation.
