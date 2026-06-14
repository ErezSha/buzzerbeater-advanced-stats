---
name: prediction-harness
description: The win-probability validation/data-gathering harness — commands, layout, design choices
metadata:
  type: project
---

A forward-only validation harness for the matchup predictor (`src/domain/matchup.ts`),
gathering a labelled dataset to calibrate its constants ([[bb-mechanics]] explains why
availability matters) and seed a future ML model.

**Commands** (npm scripts; scripts live in the gitignored `scripts/` dir):
- `npm run sync -- --leagues=<id,id,...>` — ONLY networked command. Incremental: standings →
  schedules → timestamped roster snapshots → only-missing (immutable) box scores. Run
  BEFORE games (captures pre-game roster) and AFTER (pulls new box scores).
- `npm run predict [-- --label=x --marginStdDev=9 --homeCourt=2]` — offline. By DEFAULT predicts
  only each tracked team's single earliest upcoming league.rs game (the imminent round), so the
  intended cadence is sync+predict close to tip-off (e.g. Task Scheduler) for a fresh snapshot.
  `--all` predicts every upcoming game (one-shot full-schedule backfill). REQUIRES a pre-game
  roster snapshot for both teams (skips otherwise, never neutral-fills). Idempotent per label.
- `npm run settle [-- --label=x]` — offline. Settles predictions whose box score is now
  local; appends to `data/results/all.jsonl`; prints Brier + calibration table.

**Store:** `data/` (gitignored). `data/store/{standings,schedules,boxscores,rosters,meta}`,
`data/predictions/<label>.jsonl`, `data/results/all.jsonl`. No TTL (durable, unlike the
app's `.cache/bbapi/`).

**Tracked code** (not gitignored): `src/domain/prediction-eval.ts` (brier/calibration math,
unit-tested), `parseRoster` now also reads `<dmi>` (added to `Player` type). Scripts +
`scripts/lib/{env,store,matches,records}.ts` are gitignored like the pre-existing `fetch.mjs`.

**Design choices (locked):** league.rs only; season-to-date symmetric ORtg/DRtg/pace from
games before each match; availability mandatory. First dry-run synced Israeli league 1003
(season 72) → 80 upcoming predictions under label `default`.

**Roster-change adjustment** (`src/domain/roster-delta.ts`, unit-tested): season efficiency
is reconstructed from box scores that include since-sold players, so it mis-states a team
that bought/sold between the window and the game. Per side we compute DEPARTED (had window
minutes, absent from pre-game snapshot — valued by minutes/GmSc + last-known salary/DMI
recovered from older snapshots via `lastKnownValuesBefore`) and ARRIVED (on snapshot, no
window history — only salary/DMI can value a signing). `rosterDeltaFactor(delta, proxy)` =
`clamp(1 + (arrivedValue−departedValue)/windowValue, 0.6, 1.2)`; proxy ∈ salary|dmi|minutes|none
(`--strengthProxy`, default salary). Cold-start guard: if a departed player can't be priced
(sold before our first snapshot ⇒ null salary), fall back to the minutes discount so unpriced
arrivals can't masquerade as strengthening. Minutes normalized by 240 (matchup's
TOTAL_GAME_MINUTES). Effective strengthModifier = base availability × factor (clamped). Raw
departed/arrived sets frozen on every row so any proxy is replayable offline. `rosterDisruption`
> cutoff (`--disruptionCutoff`, default 0.25) ⇒ row `lowConfidence=true`; settle excludes
those from headline metrics. This IS now wired into `predictMatchup` via strengthModifier.

**Roster snapshot dedup** (`writeRosterSnapshot`): SHA-256 of the players array (ignoring
`capturedAt`); skips the write if byte-identical to the team's newest snapshot. Content-based,
so any real change — game shape, injury, OR a buy/sell — writes a fresh snapshot; only
redundant within-week syncs are dropped. sync logs `N new, M deduped`.
