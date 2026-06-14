# Picks Game PRD

## Overview

A lightweight prediction game built on top of the win-probability harness. Players
authenticate with their BuzzerBeater credentials, start with a credit bankroll, and
place variable-stake bets against model-derived spreads and odds on upcoming BB league
games. No real money is ever involved — prizes, if any, are symbolic (e.g. a BB
subscription). The game is a closed, invite-style community among BB players.

---

## Goals

- Let BB players compete on prediction skill using the model's spreads and odds as the
  betting line.
- Authenticate users with zero new account overhead (BB username + readonly security
  code as identity).
- Persist picks and credit balances durably so the leaderboard survives deploys.
- Present a life-like betting interface (spread, moneyline, variable stakes) without
  any real-money mechanic.
- Settle picks automatically when `npm run settle` runs — no manual grading.

## Non-Goals

- Real money, payment processing, or anything resembling regulated gambling.
- Picks on non-league (cup / exhibition) games — the model only covers `league.rs`.
- Live in-game betting; all picks lock at the scheduled tip-off time.
- Public registration; access is by invite (known BB players only).

---

## Identity & Auth

### Mechanism

Players log in with their **BB username + readonly security code**. The server
validates the credentials by attempting a BB API login (`login.aspx`). On success it
issues a signed HTTP-only session cookie (`player_session`) that contains the BB
username as the player identity. The BB credentials are **never stored** — they are
used once per login to verify identity and then discarded.

The readonly security code is specifically designed for third-party tool use in BB;
this is its intended purpose.

### Session

- Sessions are server-side and expire after 30 days of inactivity.
- No "change password" flow — if a player rotates their BB security code, they log in
  with the new one; the old session expires naturally.
- First login auto-creates the player row in the database (username, joined_at,
  opening balance).

---

## Credit Economy

| constant | value | rationale |
|---|---|---|
| Opening balance | 1 000 credits | Enough runway to absorb early losses |
| Minimum stake | 10 credits | Prevents trivial hedging |
| Maximum stake | 250 credits | 25% of opening balance per pick |
| Vig | 5% | Applied to both sides; makes random picking slowly lose credits |

The vig means fair odds are shaded by ~5% — the expected return on a 50/50 pick at
−110/−110 is −4.5% per bet, which keeps the leaderboard from being pure noise over a
full season.

Credits are for the game only. There is no mechanism to convert them to anything of
real-world value.

---

## Betting Lines

Each eligible game exposes two bet types. Both are derived from the prediction row in
`data/predictions/<label>.jsonl`.

### 1. Point Spread

The model's predicted margin (`prediction.spread`) is presented as the line. Both
sides are offered at **−110** (risk 110 to win 100), since the spread is already
meant to make the game ~50/50.

```
Home −7   −110 / −110   Away +7
```

A spread pick wins if the chosen side covers the spread:
- Home pick wins when `actualMargin > spread` (home covers).
- Away pick wins when `actualMargin < spread` (away covers).
- Push (exact) — stake is refunded, no win/loss (BB has no draws so this is rare
  but possible if the model's spread hits exactly).

### 2. Moneyline

Derived from `prediction.homeWinProbability` (call it `p`). Fair odds are converted
to American format and then both sides are shaded by the 5% vig:

```
fair home moneyline = -(p / (1−p)) × 100     [when p ≥ 0.5]
fair away moneyline = +((1−p) / p) × 100     [when p < 0.5]
```

Vig adjustment: add ~5% to the implied probability of each side, then re-convert.
The exact formula:

```
viggedP_home = p × 1.05
viggedP_away = (1−p) × 1.05
home ML = -(viggedP_home / (1 − viggedP_home)) × 100
away ML = +((1 − viggedP_away) / viggedP_away) × 100
```

Both values are rounded to the nearest 5 for readability (−225, −120, +175, etc.).

A moneyline pick wins simply if the chosen side wins the game.

### Line locking

Both lines are frozen at prediction time (`predictedAt` on the prediction row). If a
game is replayed under different constants (e.g. a new `--marginStdDev` run), picks
already placed continue to settle against the line they were made at.

**Picks lock when `now >= match.date` (tip-off).** The UI disables the bet form and
shows "Locked" from that point forward.

---

## Pick Placement

A player may place **one spread pick and/or one moneyline pick per game**. They cannot
change a pick after placement.

Pick record fields:

```
player_id       TEXT     -- BB username
match_id        TEXT     -- from predictions table
bet_type        TEXT     -- "spread" | "moneyline"
side            TEXT     -- "home" | "away"
stake           INTEGER  -- credits risked (10–250)
odds            INTEGER  -- American odds at time of pick (e.g. -110, +175)
line_spread     REAL     -- model spread at pick time (for audit trail)
placed_at       TEXT     -- ISO timestamp
settled_at      TEXT     -- null until settled
payout          INTEGER  -- null until settled; negative = loss (stake not returned)
result          TEXT     -- null | "win" | "loss" | "push"
```

`payout` on win: `stake × (|odds| / 100)` when odds are positive,
`stake × (100 / |odds|)` when odds are negative.

On loss: `payout = -stake`. On push: `payout = 0`, stake is returned.

---

## Settlement

Settlement is triggered by `npm run settle`. When a game settles, the script:

1. Looks up all open picks for that `matchId`.
2. Grades each pick against the actual result:
   - Spread picks: compare `actualMargin` vs. `line_spread`.
   - Moneyline picks: `homeWon` vs. `side`.
3. Writes `result`, `payout`, and `settled_at` to the picks table.
4. Updates each player's `balance` in the players table.

Settlement is idempotent: re-running settle on an already-settled game is a no-op.

---

## UI

### Pages

| route | description |
|---|---|
| `/picks` | Lobby: upcoming games with lines; place picks |
| `/picks/my` | My open picks (unsettled) and history (settled) |
| `/picks/leaderboard` | Rankings: balance, record (W-L-P), ROI |
| `/picks/login` | BB credential form |

### Lobby (`/picks`)

- One card per upcoming eligible game (same games that have a prediction row and a
  pre-game roster snapshot for both teams).
- Shows: home vs. away team names, tip-off date/time, spread line, moneyline odds.
- If `lowConfidence=true` on the prediction, show a subtle warning badge
  ("Roster in flux") — the line is still offered but the player is informed.
- Pick form: choose side → enter stake → confirm. Disabled once locked (past tip-off)
  or if player has already picked that bet type for that game.
- Running balance shown in the nav.

### My Picks (`/picks/my`)

Two tabs: **Open** (locked but not yet settled) and **History** (settled). Each row
shows: game, bet type, side chosen, stake, odds, line, outcome, payout/loss.

### Leaderboard (`/picks/leaderboard`)

Sortable by: balance (default), ROI (`total payout / total staked`), record.
Columns: rank, player, balance, total picks, W-L-P, ROI %.

---

## Data Model (SQLite / Turso)

```sql
CREATE TABLE players (
  username     TEXT PRIMARY KEY,   -- BB username (from auth)
  display_name TEXT,               -- populated from teaminfo.owner at first login
  balance      INTEGER NOT NULL DEFAULT 1000,
  joined_at    TEXT NOT NULL
);

CREATE TABLE picks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id    TEXT NOT NULL REFERENCES players(username),
  match_id     TEXT NOT NULL,
  bet_type     TEXT NOT NULL CHECK(bet_type IN ('spread','moneyline')),
  side         TEXT NOT NULL CHECK(side IN ('home','away')),
  stake        INTEGER NOT NULL,
  odds         INTEGER NOT NULL,
  line_spread  REAL NOT NULL,
  placed_at    TEXT NOT NULL,
  settled_at   TEXT,
  payout       INTEGER,
  result       TEXT CHECK(result IN ('win','loss','push',NULL)),
  UNIQUE(player_id, match_id, bet_type)
);
```

`balance` on the `players` table is the authoritative credit balance. It is updated
atomically (within a transaction) when settlement writes the payout.

---

## Tech Stack Notes

| concern | decision |
|---|---|
| Auth | BB API login validation → signed HTTP-only cookie (Next.js API route) |
| Database | Turso (SQLite over HTTP) via `@libsql/client`; works on Vercel serverless |
| Prediction source | Reads `data/predictions/default.jsonl` from local store (same as settle) |
| Settlement hook | Added to `scripts/settle.ts` — grades picks after scoring games |
| Hosting | Vercel; `data/` store is read via filesystem (predictions are written by the sync/predict scripts running locally, not by the web app) |

The web app is **read-only against the prediction store**. It does not call BB API
during normal operation (only at login time). All game data comes from the local
JSONL/box-score files already on disk.

---

## Invite / Access Control

No self-registration. A player can only log in if their BB username exists in the
`players` table. A seed script (or a simple admin API route behind a secret header)
inserts new player rows. This keeps the game closed to a known circle without
building a full admin UI.

---

## Files

| file | status | purpose |
|---|---|---|
| `src/app/picks/page.tsx` | New | Lobby |
| `src/app/picks/my/page.tsx` | New | My picks |
| `src/app/picks/leaderboard/page.tsx` | New | Leaderboard |
| `src/app/picks/login/page.tsx` | New | BB credential login form |
| `src/app/api/picks/route.ts` | New | Place / read picks |
| `src/app/api/picks/auth/route.ts` | New | BB login → session cookie |
| `src/domain/odds.ts` | New | Probability → American odds + vig conversion |
| `src/domain/settlement.ts` | New | Grade a pick against actuals |
| `scripts/settle.ts` | Modify | Hook: grade open picks after scoring games |
| `src/db/schema.sql` | New | Players + picks DDL |
| `src/db/client.ts` | New | Turso `@libsql/client` singleton |

No changes to the existing BBAPI adapter, sync pipeline, or prediction engine.

---

## Open Questions

- **Label**: which prediction label does the game read from? Make it a config value
  so it can be swapped without code changes once a better-calibrated model exists.
  Default to `default` for now.
- **Low-confidence games**: offer them with a warning badge or suppress entirely?
  Deferred — a fix may present itself as the roster cold-start problem resolves
  naturally with more syncs. Revisit once the 53% exclusion rate drops.

## Resolved

- **Balance floor**: players can go negative. No bailout mechanic. Negative balance
  is a meaningful leaderboard signal that distinguishes bad pickers from unlucky ones
  over a full season. Show a visual indicator (red balance) below zero.
- **Display name**: populated from `teaminfo.owner` at first login — the BB owner
  name is already a known identity in the community and requires no extra input from
  the player. Stored in `players.display_name`.
