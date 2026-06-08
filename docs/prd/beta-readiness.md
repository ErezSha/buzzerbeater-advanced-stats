# Readiness checllist for beta

- [x] all of our derived stats formulas match the glossary formulas in @docs/references/glossary.md
  - Shooting stats (FG%, 2P%, 3P%, FT%, eFG%, TSA, TS%, GmSc) and TOV% already match the reference (the reference's `100 *` is just the percentage display convention — metrics are stored as 0–1 fractions and `formatPercent` multiplies by 100).
  - **Fixed (hybrid):** AST%, BLK%, STL%, TRB%, Usg% now include the reference minutes-share factor `MP / (Tm MP / 5)` (`minutesShare` in `src/domain/metrics.ts`). Team minutes are recovered by summing per-player minutes from the box score. In-app glossary (`src/domain/glossary.ts`) updated to match; unit tests cross-check values against the reference glossary.
  - **Intentional, documented deviation:** Estimated Possessions uses the simplified single-team estimate `FGA + 0.44*FTA − ORB + TOV` rather than the full Dean Oliver averaged formula. This also feeds ORtg/DRtg/Pace and the opponent-possessions term inside STL%.
- [] small form in the UI that can replace the vars we have in @.env.local - our server also need a way to recieve this from the UI and use it when `env is production` - I'm thinking save in localStorage and have a way for the user to delete it
- [] Tanstack tables need to be mobile ready - I think either `CSS Grid` or `Adaptive column visibility` or `overflow-x-auto` wrapper - not sure yet.
