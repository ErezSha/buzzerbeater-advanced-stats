/**
 * Probes whether teamstats?mode=totals includes cup/bbm games or only league.rs.
 *
 * Strategy: compare the `games` field from teamstats totals against the
 * finished-game counts per type from schedule.aspx.
 *
 * Usage:
 *   node scripts/probe-teamstats-game-types.mjs
 */

import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "http://bbapi.buzzerbeater.com";

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
  // Get own team ID
  const teamInfoDoc = parser.parse(await bbRequest("teaminfo.aspx"));
  checkError(teamInfoDoc);
  const teamRaw = [teamInfoDoc?.bbapi?.team ?? []].flat()[0] ?? teamInfoDoc?.bbapi?.team;
  const teamId = teamRaw?.id ?? teamRaw?.teamid;
  console.log(`Team ID: ${teamId}\n`);

  // ------------------------------------------------------------------
  // 1. Schedule: count finished games by type
  // ------------------------------------------------------------------
  console.log("=== schedule.aspx — finished game counts by type ===");
  const scheduleRaw = await bbRequest("schedule.aspx", { teamid: teamId });
  console.log("Raw XML (first 2000 chars):");
  console.log(scheduleRaw.slice(0, 2000), "\n");
  const scheduleDoc = parser.parse(scheduleRaw);
  checkError(scheduleDoc);

  const matches = [scheduleDoc.bbapi?.schedule?.match ?? []].flat();
  // Matches are finished when their start date is in the past (same logic as parseSchedule adapter)
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
  const leagueOnly = (countByType["league.rs"] ?? 0) + (countByType["league.rs.tv"] ?? 0);
  const total = finished.length;
  console.log(`\n  league.rs + league.rs.tv: ${leagueOnly}`);
  console.log(`  all finished:             ${total}`);

  // ------------------------------------------------------------------
  // 2. teamstats?mode=totals — what does `games` say?
  // ------------------------------------------------------------------
  console.log("\n=== teamstats.aspx?mode=totals — games field per player ===");
  const totalsDoc = parser.parse(await bbRequest("teamstats.aspx", { teamid: teamId, mode: "totals" }));
  checkError(totalsDoc);

  const players = [totalsDoc.bbapi?.teamTotals?.player ?? []].flat();
  const gameCounts = players.map((p) => {
    const games = Number(p.totals?.games ?? p.totals?.[0]?.games ?? 0);
    const name = `${p.firstName} ${p.lastName}`;
    return { name, games };
  });

  const maxGames = Math.max(...gameCounts.map((p) => p.games));
  console.log(`Max games in totals: ${maxGames}`);
  console.log("\nAll players:");
  for (const p of gameCounts) {
    console.log(`  ${p.name}: ${p.games} games`);
  }

  // ------------------------------------------------------------------
  // 3. Conclusion
  // ------------------------------------------------------------------
  console.log("\n=== Conclusion ===");
  if (maxGames === leagueOnly) {
    console.log(`✓ teamstats max games (${maxGames}) matches league.rs-only count (${leagueOnly}).`);
    console.log("  → teamstats?mode=totals appears to count ONLY league.rs games.");
  } else if (maxGames === total) {
    console.log(`✗ teamstats max games (${maxGames}) matches ALL finished games (${total}).`);
    console.log("  → teamstats?mode=totals appears to count ALL game types (cup/bbm included).");
  } else {
    console.log(`? teamstats max games (${maxGames}) matches neither league-only (${leagueOnly}) nor all (${total}).`);
    console.log("  → Could be player substitution patterns (not all players start every game).");
    console.log("  → Try checking if ANY player's games > league-only count:");
    const overLeague = gameCounts.filter((p) => p.games > leagueOnly);
    if (overLeague.length > 0) {
      console.log("    Players with more games than league-only count:");
      for (const p of overLeague) console.log(`      ${p.name}: ${p.games}`);
      console.log("  → teamstats INCLUDES non-league games.");
    } else {
      console.log("    No player exceeds league-only count → teamstats likely counts only league games.");
    }
  }

} finally {
  await bbRequest("logout.aspx").catch(() => {});
  console.log("\nLogged out.");
}
