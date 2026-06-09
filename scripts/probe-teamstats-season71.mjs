/**
 * Verifies whether teamstats.aspx?season=71 includes playoff games.
 *
 * Strategy: season 71 has playoffs played. Count finished games per type from
 * schedule.aspx?season=71, then compare against the max `games` value from
 * teamstats.aspx?season=71&mode=totals. If teamstats games == regular-only,
 * playoffs are excluded; if it == regular + playoff, they're included.
 *
 * Usage:
 *   node scripts/probe-teamstats-season71.mjs
 *
 * Reads credentials from .env.local (BB_LOGIN, BB_SECURITY_CODE).
 */

import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "http://bbapi.buzzerbeater.com";
const SEASON = "71";
const PLAYOFF_TYPES = new Set([
  "league.quarterfinal",
  "league.semifinal",
  "league.final",
]);
const REGULAR_TYPES = new Set(["league.rs", "league.rs.tv"]);

function readDotEnv(path = ".env.local") {
  const text = readFileSync(path, "utf8");
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (/^["']/.test(value) && value[0] === value.at(-1)) value = value.slice(1, -1);
    values[m[1]] = value;
  }
  return values;
}

let cookieHeader = null;

function storeCookies(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (!setCookies.length) return;
  const pairs = new Map();
  for (const pair of cookieHeader?.split(";") ?? []) {
    const s = pair.trim();
    const i = s.indexOf("=");
    if (i > 0) pairs.set(s.slice(0, i), s.slice(i + 1));
  }
  for (const sc of setCookies) {
    const pair = sc.split(";")[0]?.trim();
    const i = pair?.indexOf("=") ?? -1;
    if (pair && i > 0) pairs.set(pair.slice(0, i), pair.slice(i + 1));
  }
  cookieHeader = [...pairs].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function bbRequest(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const headers = cookieHeader ? { Cookie: cookieHeader } : {};
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${endpoint}`);
  storeCookies(response);
  return response.text();
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  isArray: (name) => ["match", "player", "team", "conference"].includes(name),
});

function checkError(doc) {
  const err = doc?.bbapi?.error;
  if (err) throw new Error(`BBAPI error: ${err?.message ?? JSON.stringify(err)}`);
}

const env = readDotEnv();
if (!env.BB_LOGIN || !env.BB_SECURITY_CODE) {
  console.error("Missing BB_LOGIN or BB_SECURITY_CODE in .env.local");
  process.exit(1);
}

console.log(`Logging in as ${env.BB_LOGIN}...`);
checkError(parser.parse(await bbRequest("login.aspx", { login: env.BB_LOGIN, code: env.BB_SECURITY_CODE })));
console.log("OK\n");

try {
  const teamInfoDoc = parser.parse(await bbRequest("teaminfo.aspx"));
  checkError(teamInfoDoc);
  const teamRaw = [teamInfoDoc?.bbapi?.team ?? []].flat()[0] ?? teamInfoDoc?.bbapi?.team;
  const teamId = teamRaw?.id ?? teamRaw?.teamid;
  console.log(`Team ID: ${teamId}\n`);

  // ------------------------------------------------------------------
  // 1. Schedule (season 71): count finished games by type
  // ------------------------------------------------------------------
  console.log(`=== schedule.aspx?season=${SEASON} — finished game counts by type ===`);
  const scheduleDoc = parser.parse(await bbRequest("schedule.aspx", { teamid: teamId, season: SEASON }));
  checkError(scheduleDoc);

  const matches = [scheduleDoc.bbapi?.schedule?.match ?? []].flat();
  const now = Date.now();
  const finished = matches.filter((m) => {
    const date = m.start ?? m.date ?? m["#text"];
    return date && new Date(date).getTime() <= now;
  });

  const countByType = {};
  for (const m of finished) {
    const type = m.type ?? "(unknown)";
    countByType[type] = (countByType[type] ?? 0) + 1;
  }

  console.log("Finished games by type:");
  for (const [type, count] of Object.entries(countByType)) {
    console.log(`  ${type}: ${count}`);
  }

  const regularCount = Object.entries(countByType)
    .filter(([t]) => REGULAR_TYPES.has(t))
    .reduce((sum, [, c]) => sum + c, 0);
  const playoffCount = Object.entries(countByType)
    .filter(([t]) => PLAYOFF_TYPES.has(t))
    .reduce((sum, [, c]) => sum + c, 0);

  console.log(`\n  regular (league.rs[.tv]):        ${regularCount}`);
  console.log(`  playoff (qf/sf/final):           ${playoffCount}`);
  console.log(`  regular + playoff:               ${regularCount + playoffCount}`);

  if (playoffCount === 0) {
    console.log("\n⚠  No playoff games found in season 71 schedule for this team.");
    console.log("   (Team may not have made the playoffs that season — try another team id.)");
  }

  // ------------------------------------------------------------------
  // 2. teamstats (season 71): max games per player
  // ------------------------------------------------------------------
  console.log(`\n=== teamstats.aspx?season=${SEASON}&mode=totals — games per player ===`);
  const totalsDoc = parser.parse(
    await bbRequest("teamstats.aspx", { teamid: teamId, season: SEASON, mode: "totals" }),
  );
  checkError(totalsDoc);

  const players = [totalsDoc.bbapi?.teamTotals?.player ?? []].flat();
  const gameCounts = players.map((p) => ({
    name: `${p.firstName} ${p.lastName}`,
    games: Number(p.totals?.games ?? p.totals?.[0]?.games ?? 0),
  }));

  const maxGames = Math.max(0, ...gameCounts.map((p) => p.games));
  console.log(`Max games in totals: ${maxGames}`);
  for (const p of gameCounts) {
    console.log(`  ${p.name}: ${p.games} games`);
  }

  // ------------------------------------------------------------------
  // 3. Conclusion
  // ------------------------------------------------------------------
  console.log("\n=== Conclusion ===");
  if (maxGames === regularCount) {
    console.log(`teamstats max games (${maxGames}) == regular-only count (${regularCount}).`);
    console.log("  → teamstats EXCLUDES playoff games. seasonStat is regular-season-only.");
  } else if (maxGames === regularCount + playoffCount) {
    console.log(`teamstats max games (${maxGames}) == regular + playoff (${regularCount + playoffCount}).`);
    console.log("  → teamstats INCLUDES playoff games. seasonStat == the 'all' segment.");
  } else {
    console.log(`teamstats max games (${maxGames}) matches neither:`);
    console.log(`    regular-only:      ${regularCount}`);
    console.log(`    regular + playoff: ${regularCount + playoffCount}`);
    console.log("  → Inconclusive (rotation/DNPs). Inspect the per-player counts above.");
  }
} finally {
  await bbRequest("logout.aspx").catch(() => {});
  console.log("\nLogged out.");
}
