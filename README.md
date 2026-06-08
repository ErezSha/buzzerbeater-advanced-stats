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

### Production / Vercel credentials

On a deployed instance there is no `.env.local`. Instead, leave `BB_LOGIN`/`BB_SECURITY_CODE`
unset and enter your login and read-only access code through the app's sign-in form. The server
verifies them against BBAPI and stores them in a Secure, httpOnly cookie that is AES-256-GCM
encrypted with `CREDENTIALS_SECRET`. Use the in-app **Sign out** button to clear them.

Set `CREDENTIALS_SECRET` to a long random string in the Vercel project's environment variables.
Credential resolution is env-first: when `BB_LOGIN`/`BB_SECURITY_CODE` are present they win and the
cookie path is never used, so local development with `.env.local` is unchanged.

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

To check whether a specific player id can be fetched, pass `-PlayerId`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\bbapi-smoke.ps1 -PlayerId 55713639
```
