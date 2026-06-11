# AGENTS.md

## Project Overview

BuzzerBeater Advanced Stats is a personal analytics dashboard for a BuzzerBeater team. It uses BBAPI data to calculate and display modern basketball metrics that are missing or hard to compare in the game UI.

The MVP should focus on reliable team, player, game, and trend views. Prefer practical, explainable metrics first. Keep full individual ORtg/DRtg, PER, and Win Shares as post-MVP research unless the PRD is updated.

## Tech Stack

- Next.js
- React
- TypeScript
- shadcn/ui
- Tailwind CSS
- TanStack Table
- Recharts
- Server-side BBAPI client
- XML parsing adapter
- Local cache, initially file-backed or similarly lightweight

Keep BBAPI credentials server-side. Do not expose the read-only security code to browser code or logs.

## Testing

Test LOGIC ONLY - there's no need to test visual pages at all

## Docs Index

- `docs/prd/prd-mvp.md` - MVP product requirements and implementation source of truth.
- `docs/references/buzzerbeater-api.md` - BBAPI endpoints, auth flow, XML behavior, and errors.
- `docs/references/buzzerbeater-schemas.md` - BBAPI types examples.
- `docs/references/buzzer-beater-enthusiasm.md` - explanation about how "enthusiasm" works in BuzzerBeater
- `docs/references/glossary.md` - Basketball stat definitions and formulas.
- `docs/references/individual-ORtg-DRtg.md` - Detailed Dean Oliver individual offensive/defensive rating formulas; post-MVP.
- `docs/references/win-shares.md` - Win Shares methodology; post-MVP.
- `docs/references/calculating-PER.md` - PER methodology; post-MVP.
