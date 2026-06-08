/**
 * Fetches the season 71 schedule for the logged-in team and prints all distinct
 * match types, with one representative match entry per type. Used to discover
 * what type value playoff games carry so we can update isLeagueMatch() and
 * the schema docs.
 *
 * Usage:
 *   node scripts/probe-season71-schedule.mjs
 *
 * Reads credentials from .env.local (BB_LOGIN, BB_SECURITY_CODE).
 */

import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "http://bbapi.buzzerbeater.com";
const SEASON = "71";

function readDotEnv(path = ".env.local") {
  const text = readFileSync(path, "utf8");
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[m[1]] = value;
  }
  return values;
}

let cookieHeader = null;

function storeCookies(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  if (setCookies.length === 0) return;
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
  const headers = {};
  if (cookieHeader) headers["Cookie"] = cookieHeader;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${endpoint}`);
  storeCookies(response);
  return response.text();
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  isArray: (name) => ["match", "player", "team"].includes(name),
});

function checkBbapiError(doc) {
  const err = doc?.bbapi?.error;
  if (err) {
    const msg = err?.message ?? err?.["#text"] ?? JSON.stringify(err);
    throw new Error(`BBAPI error: ${msg}`);
  }
}

const env = readDotEnv();
const login = env.BB_LOGIN;
const code = env.BB_SECURITY_CODE;

if (!login || !code) {
  console.error("Missing BB_LOGIN or BB_SECURITY_CODE in .env.local");
  process.exit(1);
}

console.log(`Logging in as ${login}...`);
const loginXml = await bbRequest("login.aspx", { login, code });
checkBbapiError(parser.parse(loginXml));
console.log("Login OK.\n");

try {
  const teamInfoXml = await bbRequest("teaminfo.aspx");
  const teamInfoDoc = parser.parse(teamInfoXml);
  checkBbapiError(teamInfoDoc);
  const teamId =
    teamInfoDoc?.bbapi?.team?.id ?? teamInfoDoc?.bbapi?.team?.teamid;
  console.log(`Team ID: ${teamId}\n`);

  console.log(`=== schedule.aspx?teamid=${teamId}&season=${SEASON} ===\n`);
  const scheduleXml = await bbRequest("schedule.aspx", {
    teamid: teamId,
    season: SEASON,
  });
  const scheduleDoc = parser.parse(scheduleXml);
  checkBbapiError(scheduleDoc);

  const matches = scheduleDoc?.bbapi?.schedule?.match ?? [];
  console.log(`Total matches in season ${SEASON}: ${matches.length}\n`);

  // Group by type, keep one representative per type
  const byType = new Map();
  for (const match of matches) {
    const type = match.type ?? "(no type)";
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(match);
  }

  console.log("=== Match types found ===");
  for (const [type, group] of [...byType].sort()) {
    console.log(`\ntype: "${type}"  (${group.length} matches)`);
    const rep = group[0];
    console.log("  Representative match:");
    console.log(`    id:    ${rep.id ?? rep.matchid}`);
    console.log(`    start: ${rep.start ?? rep.date}`);
    console.log(
      `    home:  ${rep.homeTeam?.teamName ?? rep.homeTeam?.name ?? JSON.stringify(rep.homeTeam)}`,
    );
    console.log(
      `    away:  ${rep.awayTeam?.teamName ?? rep.awayTeam?.name ?? JSON.stringify(rep.awayTeam)}`,
    );
  }

  console.log("\n=== Raw schedule XML (first 4000 chars) ===");
  console.log(scheduleXml.slice(0, 4000));
} finally {
  await bbRequest("logout.aspx").catch(() => {});
  console.log("\nLogged out.");
}
