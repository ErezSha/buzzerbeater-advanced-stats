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
- `npm run predict [-- --label=x --marginStdDev=9 --homeCourt=2]` — offline. Predicts only
  upcoming league.rs games between tracked teams; REQUIRES a pre-game roster snapshot for
  both teams (skips otherwise, never neutral-fills). Idempotent per label.
- `npm run settle [-- --label=x]` — offline. Settles predictions whose box score is now
  local; appends to `data/results/all.jsonl`; prints Brier + calibration table.

**Store:** `data/` (gitignored). `data/store/{standings,schedules,boxscores,rosters,meta}`,
`data/predictions/<label>.jsonl`, `data/results/all.jsonl`. No TTL (durable, unlike the
app's `.cache/bbapi/`).

**Tracked code** (not gitignored): `src/domain/prediction-eval.ts` (brier/calibration math,
unit-tested), `parseRoster` now also reads `<dmi>` (added to `Player` type). Scripts +
`scripts/lib/{env,store,matches,records}.ts` are gitignored like the pre-existing `fetch.mjs`.

**Design choices (locked):** league.rs only; season-to-date symmetric ORtg/DRtg/pace from
games before each match; availability mandatory; DMI+salary captured per player for
experiments but NOT wired into `predictMatchup` (the model is unchanged). First dry-run
synced Israeli league 1003 (season 72) → 80 upcoming predictions under label `default`.
