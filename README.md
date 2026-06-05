# BuzzerBeater Advanced Stats

Private local dashboard for analyzing a BuzzerBeater team with BBAPI data and explainable basketball metrics.

## Requirements

- Node.js 24 or newer
- npm 11 or newer
- BuzzerBeater BBAPI credentials

## Install

Install dependencies from the repository root:

```powershell
npm install
```

Create local environment variables:

```powershell
Copy-Item .env.example .env.local
```

Then edit `.env.local`:

```text
BB_LOGIN=your-login-name
BB_SECURITY_CODE=your-read-only-security-code
BB_SECOND_TEAM=
```

`BB_SECOND_TEAM` is optional. Set it to `1` only if you want BBAPI to use a second team.

## Dev Up

Start the Next.js dev server:

```powershell
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## Dev Down

If the dev server is running in the foreground, press:

```text
Ctrl+C
```

If it was started in the background and you know the process id:

```powershell
taskkill /PID <pid> /T /F
```

If you need to find the process using port `3000`:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { taskkill /PID $_ /T /F }
```

## Checks

Run the current foundation checks:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## BBAPI Smoke Test

The Phase 0 smoke test verifies live BBAPI auth and endpoint shape without printing credentials, cookies, raw XML, team names, player names, or match ids:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bbapi-smoke.ps1
```
