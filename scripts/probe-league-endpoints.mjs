/**
 * Probes standings.aspx and teamstats.aspx?mode=totals to understand the
 * full XML structure so we can write correct adapters.
 *
 * Usage:
 *   node scripts/probe-league-endpoints.mjs
 *
 * Reads credentials from .env.local (BB_LOGIN, BB_SECURITY_CODE).
 */

import { readFileSync } from "fs";
import { XMLParser } from "fast-xml-parser";

const BASE_URL = "http://bbapi.buzzerbeater.com";

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
  // --------------------------------------------------------------------------
  // 1. teaminfo.aspx — get our leagueId
  // --------------------------------------------------------------------------
  console.log("=== teaminfo.aspx ===");
  const teamInfoXml = await bbRequest("teaminfo.aspx");
  const teamInfoDoc = parser.parse(teamInfoXml);
  checkBbapiError(teamInfoDoc);
  const teamId = teamInfoDoc?.bbapi?.team?.id ?? teamInfoDoc?.bbapi?.team?.teamid;
  const leagueId = teamInfoDoc?.bbapi?.team?.league?.id;
  console.log(`Team ID: ${teamId}, League ID: ${leagueId}\n`);

  // --------------------------------------------------------------------------
  // 2. standings.aspx — full structure
  // --------------------------------------------------------------------------
  console.log(`=== standings.aspx?leagueid=${leagueId} ===`);
  const standingsXml = await bbRequest("standings.aspx", { leagueid: leagueId });
  console.log("--- Raw XML (first 3000 chars) ---");
  console.log(standingsXml.slice(0, 3000));
  const standingsDoc = parser.parse(standingsXml);
  checkBbapiError(standingsDoc);
  console.log("\n--- Full parsed JSON ---");
  console.log(JSON.stringify(standingsDoc, null, 2));

  // --------------------------------------------------------------------------
  // 3. teamstats.aspx?mode=totals — for own team
  // --------------------------------------------------------------------------
  console.log(`\n=== teamstats.aspx?teamid=${teamId}&mode=totals ===`);
  const totalsXml = await bbRequest("teamstats.aspx", { teamid: teamId, mode: "totals" });
  console.log("--- Raw XML (first 3000 chars) ---");
  console.log(totalsXml.slice(0, 3000));
  const totalsDoc = parser.parse(totalsXml);
  checkBbapiError(totalsDoc);
  console.log("\n--- Full parsed JSON ---");
  console.log(JSON.stringify(totalsDoc, null, 2));

} finally {
  await bbRequest("logout.aspx").catch(() => {});
  console.log("\nLogged out.");
}
