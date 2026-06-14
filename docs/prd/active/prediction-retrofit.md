# Prediction Retrofit: Individual ORtg/DRtg, PER, and Win Shares

## Context

The win-probability validation harness (`sync` / `predict` / `settle`) accumulates a
labelled dataset of pre-game inputs and actual results. Box scores are stored immutably —
every per-player stat line is on disk and never needs to be refetched. This makes the
retrofit of individual efficiency metrics a **pure offline computation** over existing data:
no BBAPI changes, no new sync commands, no schema migrations.

This PRD covers the three tiers of retrofit in priority order:

1. **Individual ORtg / DRtg** — absolute, no league-context dependency (highest confidence).
2. **PER** — league-relative normalization; needs full league coverage.
3. **Win Shares** — most involved; same league-context dependency as PER.

---

## What the store already has

Each box score file at `data/store/boxscores/<matchId>.json` contains:

**Per-player line** (both teams): `minutes`, `points`, `fieldGoals`, `fieldGoalAttempts`,
`twoPointMakes`, `twoPointAttempts`, `threePointMakes`, `threePointAttempts`,
`freeThrows`, `freeThrowAttempts`, `offensiveRebounds`, `defensiveRebounds`,
`totalRebounds`, `assists`, `steals`, `blocks`, `turnovers`, `fouls`, `plusMinus`.

**Team totals** (both teams): all the above aggregated, plus `offStrategy`, `defStrategy`,
`effort`, `points`.

This is the complete substrate for all three metric families. No additional data collection
is needed — the retrofit reads box scores already on disk and computes offline.

---

## Tier 1: Individual ORtg / DRtg (implement first)

### Why first
- **No league-context dependency** — computed per game, per player, from the box score
  alone (own-team totals + opponent totals + player line).
- Reference implementation already documented: `docs/references/individual-ORtg-DRtg.md`.
- Absolute units (points per 100 possessions) — no normalization constants to calibrate
  for BB vs. NBA differences.
- Feeds directly into the roster-delta strength proxy: once individual ORtg/DRtg is
  available, a departed player can be valued by accumulated efficiency rather than salary
  or DMI, which is a richer signal.

### Implementation

New pure module: `src/domain/individual-ratings.ts`

- `individualORtg(playerLine, teamTotals, opponentTotals)` → `number | null`
- `individualDRtg(playerLine, teamTotals, opponentTotals)` → `number | null`
- Season aggregation: weighted average by minutes across all `league.rs` games before a
  cutoff date (same point-in-time pattern already used in `predict.ts` for team-level
  efficiency).

Unit tests (`tests/individual-ratings.test.ts`): hand-computed fixture against the
formulas in the reference doc; verify nulls degrade gracefully when any input is missing.

### Tie-in to prediction harness

`buildRosterDelta` in `predict.ts` already captures per-player `gmScore` from box scores.
Adding `iORtg` / `iDRtg` alongside GmSc makes the `DeltaPlayer` footprint richer for
experiments. The `--strengthProxy` knob already accepts new values at the type level —
`"iORtg"` or `"iDRtg"` would be a natural addition once those values are computed and
stored in the roster snapshots.

---

## Tier 2: PER (Player Efficiency Rating)

### Dependency: league averages
PER normalizes to 15.0 = league-average. That normalization requires:
- League-wide pace (possessions per game, averaged across all teams).
- League VOP (value of a possession = points scored / (FGA + 0.44·FTA + TO − OR)).
- League DRB% (defensive rebound share).

All three are derivable from the full set of stored box scores for a tracked league.
`sync` already pulls **every team** in each tracked league, so within a fully-synced league
the box-score coverage is complete. The gap: if a league was only partially synced (early
in the season or added mid-season), league averages are less accurate.

### Implementation

New module: `src/domain/league-context.ts`

```
deriveLeagueContext(boxScores: BoxScore[]) → { pace, vop, drbPct, lgPER }
```

`lgPER` is the unadjusted league-average efficiency rate; used as the anchor to normalize
individual PER to 15.0.

`src/domain/per.ts`

```
playerPER(playerLine, teamTotals, leagueContext) → number | null
aggregatePER(playerGames, leagueContext) → number | null
```

### BB vs. NBA constants

PER's original coefficients (the `uPER` formula weights) and the marginal-points-per-win
constant (~30 in the NBA) should be **computed from BB data** rather than borrowed
wholesale. The formula structure is portable; the constants need BB calibration. For a
first implementation, use the standard coefficients and flag the output as
"NBA-constant PER" — the dataset will show whether it produces sensible relative rankings.
Recalibrate once enough seasons are sampled.

---

## Tier 3: Win Shares (WS, WS/48)

### What it needs beyond PER
- Marginal offense / marginal defense per player (built on individual ORtg/DRtg and
  individual possessions used).
- Marginal points per win — the league-level constant. NBA is ~30; BB value is unknown
  and requires a season of actual win/loss data to fit.
- Team pace for the player's games (already in `TeamSeasonMetrics`).

Win Shares is the most involved of the three tiers. Its direct dependency chain is:

```
individual ORtg/DRtg (Tier 1)
  ↓
league context / pace (Tier 2 prerequisite)
  ↓
Win Shares
```

So implement Tiers 1 and 2 first and use the accumulated results dataset to estimate the
BB marginal-points-per-win constant before implementing WS.

### Implementation

`src/domain/win-shares.ts`

```
offensiveWinShares(playerLine, teamTotals, leagueContext, teamPace) → number | null
defensiveWinShares(playerLine, teamTotals, opponentTotals, leagueContext) → number | null
winSharesPer48(ws, minutes) → number | null
```

Reference: `docs/references/win-shares.md`.

---

## Tie-in to prediction harness (all tiers)

The prediction rows freeze departed/arrived player IDs on every prediction. Once any of
the above metrics are computable from stored box scores, they become new experiment-ready
strength proxies for the roster-delta adjustment — with **no refetch and no re-predict**:

1. Compute seasonal PER / WS/48 per player from `data/store/boxscores/`.
2. Join against the frozen `rosterDelta.departed` / `rosterDelta.arrived` player IDs in
   `data/predictions/<label>.jsonl`.
3. Replay `settle` to compare "salary proxy" accuracy vs. "WS/48 proxy" accuracy over
   the same game sample.

This is the offline-experiment pattern the harness was designed for.

---

## Data / ML note

Each of these metrics, once computed, should be folded into the settled-row feature table
(`data/results/all.jsonl`) as additional columns alongside salary and DMI. ML experiments
can then compare which player-value signal best predicts outcome across the same game
sample without re-running any network fetches.

---

## Files

| File | Status | Purpose |
|---|---|---|
| `src/domain/individual-ratings.ts` | New | Individual ORtg / DRtg per player per game |
| `tests/individual-ratings.test.ts` | New | Unit tests against formula doc |
| `src/domain/league-context.ts` | New | League-wide pace / VOP / DRB% from box scores |
| `src/domain/per.ts` | New | PER computation + league normalization |
| `src/domain/win-shares.ts` | New | OWS / DWS / WS/48 |
| `docs/references/individual-ORtg-DRtg.md` | Existing | Formula reference (Tier 1) |
| `docs/references/win-shares.md` | Existing | Formula reference (Tier 3) |
| `docs/references/calculating-PER.md` | Existing | Formula reference (Tier 2) |

No changes to `sync.ts`, store layout, or BBAPI adapters are required for any tier.
