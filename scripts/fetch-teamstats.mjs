/**
 * Fetches teamstats.aspx and schedule.aspx for a given team to inspect
 * the raw API response and understand what match types are included.
 *
 * Usage:
 *   node scripts/fetch-teamstats.mjs [teamid]
 *
 * Reads credentials from .env.local (BB_LOGIN, BB_SECURITY_CODE).
 * Defaults to team 91809 if no teamid is supplied.
 */

import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "http://bbapi.buzzerbeater.com";

// ---------------------------------------------------------------------------
// .env.local reader
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Cookie management
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  isArray: (name) => name === "match" || name === "player",
});

function parseXml(xml) {
  return parser.parse(xml);
}

function checkBbapiError(doc) {
  const err = doc?.bbapi?.error;
  if (err) {
    const msg = err?.message ?? err?.["#text"] ?? JSON.stringify(err);
    throw new Error(`BBAPI error: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const env = readDotEnv();
const login = env.BB_LOGIN;
const code = env.BB_SECURITY_CODE;
const teamId = process.argv[2] ?? "91809";

if (!login || !code) {
  console.error("Missing BB_LOGIN or BB_SECURITY_CODE in .env.local");
  process.exit(1);
}

console.log(`Logging in as ${login}...`);
const loginXml = await bbRequest("login.aspx", { login, code });
const loginDoc = parseXml(loginXml);
checkBbapiError(loginDoc);
console.log("Login OK.\n");

try {
  if (false) {
    // -------------------------------------------------------------------------
    // 1. teamstats.aspx — own team (no params)
    // -------------------------------------------------------------------------
    console.log("=== teamstats.aspx (own team) ===");
    const ownStatsXml = await bbRequest("teamstats.aspx");
    console.log("--- Raw XML ---");
    console.log(ownStatsXml);
    const ownStatsDoc = parseXml(ownStatsXml);
    checkBbapiError(ownStatsDoc);
    console.log("\n--- Parsed JSON ---");
    console.log(JSON.stringify(ownStatsDoc, null, 2));

    // -------------------------------------------------------------------------
    // 2. teamstats.aspx — target team
    // -------------------------------------------------------------------------
    if (teamId) {
      console.log(`\n=== teamstats.aspx?teamid=${teamId} ===`);
      const targetStatsXml = await bbRequest("teamstats.aspx", {
        teamid: teamId,
      });
      console.log("--- Raw XML ---");
      console.log(targetStatsXml);
      const targetStatsDoc = parseXml(targetStatsXml);
      checkBbapiError(targetStatsDoc);
      console.log("\n--- Parsed JSON ---");
      console.log(JSON.stringify(targetStatsDoc, null, 2));
    }

    // -------------------------------------------------------------------------
    // 3. schedule.aspx — target team, to inspect match types
    // -------------------------------------------------------------------------
    console.log(`\n=== schedule.aspx?teamid=${teamId} ===`);
    const scheduleXml = await bbRequest("schedule.aspx", { teamid: teamId });
    console.log("--- Raw XML ---");
    console.log(scheduleXml);
    const scheduleDoc = parseXml(scheduleXml);
    checkBbapiError(scheduleDoc);

    const matches = scheduleDoc?.bbapi?.schedule?.match ?? [];
    console.log(`\n--- Match type summary (${matches.length} matches) ---`);
    const typeCounts = {};
    for (const match of matches) {
      const type = match.type ?? "(no type)";
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
    for (const [type, count] of Object.entries(typeCounts)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log("\n--- All matches ---");
    for (const match of matches) {
      const id = match.id ?? match.matchid ?? "?";
      const type = match.type ?? "(no type)";
      const date = match.date ?? match.start ?? "?";
      const home = match.homeTeam?.teamName ?? match.homeTeam?.name ?? "?";
      const away = match.awayTeam?.teamName ?? match.awayTeam?.name ?? "?";
      console.log(`  [${id}] ${date}  type=${type}  ${home} vs ${away}`);
    }
  }

  console.log("=== boxscore.aspx (own team) ===");
  const ownStatsXml = await bbRequest("boxscore.aspx");
  console.log("--- Raw XML ---");
  console.log(ownStatsXml);
  const ownStatsDoc = parseXml(ownStatsXml);
  checkBbapiError(ownStatsDoc);
  // console.log("\n--- Parsed JSON ---");
  // console.log(JSON.stringify(ownStatsDoc, null, 2));
} finally {
  await bbRequest("logout.aspx").catch(() => {});
  console.log("\nLogged out.");
}
