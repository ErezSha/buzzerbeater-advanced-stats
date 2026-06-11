# ROADMAP

## Done
- [x] persistent data so no need to constantly refresh
- [x] make sure scrimmages are not an input to player stats
- [x] league stats
- [x] single player analysis

## Individual Player Metrics
- [ ] player PERformance
- [ ] VORP (Value Over Replacement Player) — cumulative metric: (BPM - replacement_level) × minutes_share; rewards both efficiency and playing time; great for trade analysis
- [ ] win shares
- [ ] multi year stats
- [x] feats — double-double, triple-double, quadruple-double, 5-by-5
- [x] capture +/- from box score API (currently in raw API response but not mapped into our types)

## Play-by-Play (requires subscriber API)
Unlocks lineup-level data: who is on the floor and when.
- [ ] individual ORtg + DRtg
- [ ] On-Off — team efficiency with player on court vs. without (requires knowing the "without" side)
- [ ] Adjusted Plus/Minus (APM) — regression-based, controls for teammate/opponent quality
- [ ] RAPM (ridge-regularized APM) — better stability for small samples / bench players
- [ ] 5-man lineup efficiency — which units work together
- [ ] shot location efficiency — efficiency by zone/distance; enables shot charts per player
- [ ] clutch splits — performance in games within 5 pts in final 5 mins vs. garbage time

## Team & League Intelligence
- [ ] power rankings — Elo-based, updates after every game, accounts for margin of victory
- [x] Pythagorean wins — expected W-L from points scored/allowed; flags over/underperforming teams
- [ ] strength of league — transfer translation model: when a player moves leagues, how do stats translate? Enables cross-league comparison

## Prediction & Betting Models
- [x] matchup predictor — spread, over/under, win probability from efficiency blend + home court + roster availability
- [ ] calibrate matchup constants — fit HOME_COURT_POINTS, MARGIN_STD_DEV, REPLACEMENT_RATE to actual BB game history once a multi-season sample exists
- [ ] salary-based replacement rate — REPLACEMENT_RATE is currently a flat 0.7 prior; in BB salary is directly skill-tied (no contracts/negotiations), so `replacement.salary / injured.salary` is a meaningful per-player proxy; DMI is a secondary, noisier alternative; requires identifying the next-in-rotation player as the replacement
- [ ] cross-league matchup adjustment — the matchup predictor assumes both teams play in the same league, so their ORtg/DRtg are on the same scale; for cup games vs. opponents from a different league level the stats are not comparable: a lower-league team's ORtg is inflated (easy scoring vs. weak defenses) and their DRtg is deflated (weak opponents don't score), making them look stronger than they are and skewing the forecast against the higher-league team; blocked on "Strength of League" (transfer translation model in Team & League Intelligence)

## GM / Roster Tools
- [ ] game plan optimizer — which BB offense/defense strategy settings correlate with efficiency vs. specific opponent types
- [ ] salary efficiency — production-per-dollar using BB salary + stat data
