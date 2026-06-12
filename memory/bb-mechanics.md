---
name: bb-mechanics
description: BuzzerBeater-specific game mechanics that affect stat modeling and feature engineering
metadata:
  type: project
---

## Game Shape

- Resets / updates once per week, on **Fridays**
- Stable for the entire week — no need to timestamp scrapes relative to tip-off
- Safe to read any time after Friday's update

## Enthusiasm

- Scale: 1–12 (capped at 12 going into a game)
- Controlled by effort level chosen per game: TIE (+33%), Normal (no change), CT (÷2)
- Drifts back toward 5 automatically each day and after each match
- **Not exposed by the BBAPI** — cannot be read directly
- Can be reconstructed for your own team by logging effort choices (state transitions are deterministic)
- Opponent enthusiasm is unobservable pre-game unless their lineup page data is somehow accessible

## Home Court Advantage

- **Arena quality does NOT affect home court advantage**
- A staff member called **PR-Manager** CAN affect home court advantage
- PR-Manager data is **not exposed by the BBAPI**
- Result: home court advantage is a flat, unobservable constant from the API's perspective — cannot be personalized per team
- The `HOME_COURT_POINTS = 3` constant in `matchup.ts` is a uniform prior across all matchups; there is no API signal to tune it per team

## Rest Days

- Rest days between games affect **Enthusiasm level**, not game outcome directly
- Rest days are not an independent feature for ML models — Enthusiasm is the mediating variable
- Since Enthusiasm is API-unobservable for opponents, rest days are only useful as a proxy when modeling opponents and Enthusiasm is unavailable
