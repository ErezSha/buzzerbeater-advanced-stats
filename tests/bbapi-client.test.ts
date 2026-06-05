import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getBbapiConfig,
  getPublicBbapiConfigStatus,
} from "@/server/bbapi/config";
import { createBbapiClient, type BbapiFetch } from "@/server/bbapi/client";
import { BbapiError } from "@/server/bbapi/errors";
import { buildBbapiUrl } from "@/server/bbapi/endpoints";
import { parseBbapiXml, throwIfBbapiError } from "@/server/bbapi/xml";

const config = Object.freeze({
  login: "test-manager",
  securityCode: "secret-readonly-code",
  secondTeam: true,
});

describe("BBAPI server configuration", () => {
  it("exposes public configuration status without returning credential values", () => {
    const status = getPublicBbapiConfigStatus({
      BB_LOGIN: config.login,
      BB_SECURITY_CODE: config.securityCode,
      BB_SECOND_TEAM: "1",
    });

    expect(status).toEqual({
      hasLogin: true,
      hasSecurityCode: true,
      secondTeam: true,
    });
    expect(JSON.stringify(status)).not.toContain(config.login);
    expect(JSON.stringify(status)).not.toContain(config.securityCode);
  });

  it("reports missing credentials as a typed runtime error", () => {
    expect(() =>
      getBbapiConfig({
        BB_LOGIN: "",
        BB_SECURITY_CODE: "secret-that-must-not-leak",
        BB_SECOND_TEAM: undefined,
      }),
    ).toThrow(BbapiError);

    try {
      getBbapiConfig({
        BB_LOGIN: "",
        BB_SECURITY_CODE: "secret-that-must-not-leak",
        BB_SECOND_TEAM: undefined,
      });
    } catch (error) {
      expect(error).toMatchObject({
        code: "ConfigurationError",
        retryable: false,
      });
      expect(String(error)).toContain("BB_LOGIN");
      expect(String(error)).not.toContain("secret-that-must-not-leak");
    }
  });
});

describe("BBAPI endpoints and XML errors", () => {
  it("builds encoded BBAPI URLs without logging or formatting helpers", () => {
    const url = buildBbapiUrl(
      "login.aspx",
      {
        login: "manager name",
        code: "abc+123",
        secondteam: true,
        quickinfo: false,
      },
      "http://example.test/",
    );

    expect(url.toString()).toBe(
      "http://example.test/login.aspx?login=manager+name&code=abc%2B123&secondteam=1",
    );
  });

  it("turns BBAPI error XML fixtures into typed application errors", () => {
    const xml = readFileSync(
      join(
        process.cwd(),
        "tests",
        "fixtures",
        "bbapi",
        "error-not-authorized.xml",
      ),
      "utf8",
    );
    const document = parseBbapiXml(xml, "teaminfo.aspx");

    expect(() => throwIfBbapiError(document, "teaminfo.aspx")).toThrow(
      BbapiError,
    );

    try {
      throwIfBbapiError(document, "teaminfo.aspx");
    } catch (error) {
      expect(error).toMatchObject({
        code: "NotAuthorized",
        endpoint: "teaminfo.aspx",
        retryable: true,
      });
    }
  });
});

describe("BBAPI client sessions", () => {
  it("keeps credentials and cookies inside non-serializable private fields", () => {
    const client = createBbapiClient({
      config,
      fetcher: async () =>
        xmlResponse('<bbapi version="1"><loggedIn /></bbapi>'),
    });

    expect(Object.keys(client)).toEqual([]);
    expect(JSON.stringify(client)).toBe("{}");
  });

  it("preserves cookies from login for later page requests", async () => {
    const seenCookieHeaders: Array<string | null> = [];
    const fetcher: BbapiFetch = async (url, init) => {
      const cookie = new Headers(init?.headers).get("Cookie");
      seenCookieHeaders.push(cookie);

      if (url.pathname.endsWith("/login.aspx")) {
        return xmlResponse(
          '<bbapi version="1"><loggedIn /></bbapi>',
          "BBSESSION=first; Path=/; HttpOnly",
        );
      }

      return xmlResponse('<bbapi version="1"><team id="1" /></bbapi>');
    };
    const client = createBbapiClient({ config, fetcher });

    await client.requestPage("teaminfo.aspx");

    expect(seenCookieHeaders).toEqual([null, "BBSESSION=first"]);
  });

  it("coalesces concurrent page requests into one login session", async () => {
    let loginCount = 0;
    const pageCookies: Array<string | null> = [];
    const fetcher: BbapiFetch = async (url, init) => {
      if (url.pathname.endsWith("/login.aspx")) {
        loginCount += 1;
        return xmlResponse(
          '<bbapi version="1"><loggedIn /></bbapi>',
          "BBSESSION=shared; Path=/; HttpOnly",
        );
      }

      pageCookies.push(new Headers(init?.headers).get("Cookie"));
      return xmlResponse('<bbapi version="1"><ok /></bbapi>');
    };
    const client = createBbapiClient({ config, fetcher });

    await Promise.all([
      client.requestPage("teaminfo.aspx"),
      client.requestPage("roster.aspx"),
      client.requestPage("schedule.aspx"),
    ]);

    expect(loginCount).toBe(1);
    expect(pageCookies).toEqual([
      "BBSESSION=shared",
      "BBSESSION=shared",
      "BBSESSION=shared",
    ]);
  });

  it("retries exactly once with a fresh login when a page returns NotAuthorized", async () => {
    let loginCount = 0;
    let teamInfoCount = 0;
    const teamInfoCookies: Array<string | null> = [];
    const fetcher: BbapiFetch = async (url, init) => {
      if (url.pathname.endsWith("/login.aspx")) {
        loginCount += 1;
        return xmlResponse(
          '<bbapi version="1"><loggedIn /></bbapi>',
          `BBSESSION=session-${loginCount}; Path=/; HttpOnly`,
        );
      }

      if (url.pathname.endsWith("/teaminfo.aspx")) {
        teamInfoCount += 1;
        teamInfoCookies.push(new Headers(init?.headers).get("Cookie"));

        if (teamInfoCount === 1) {
          return xmlResponse(
            '<bbapi version="1"><error message="NotAuthorized" /></bbapi>',
          );
        }

        return xmlResponse('<bbapi version="1"><team id="1" /></bbapi>');
      }

      throw new Error(`Unexpected endpoint: ${url.pathname}`);
    };
    const client = createBbapiClient({ config, fetcher });

    await client.requestPage("teaminfo.aspx");

    expect(loginCount).toBe(2);
    expect(teamInfoCount).toBe(2);
    expect(teamInfoCookies).toEqual([
      "BBSESSION=session-1",
      "BBSESSION=session-2",
    ]);
  });

  it("does not leak the security code in HTTP failure messages", async () => {
    const fetcher: BbapiFetch = async () =>
      xmlResponse('<bbapi version="1" />', undefined, 500);
    const client = createBbapiClient({ config, fetcher });

    await expect(client.login()).rejects.toMatchObject({
      code: "HttpError",
      endpoint: "login.aspx",
      status: 500,
    });
    await expect(client.login()).rejects.not.toThrow(config.securityCode);
  });
});

function xmlResponse(body: string, setCookie?: string, status = 200): Response {
  const headers = new Headers({ "content-type": "application/xml" });

  if (setCookie) {
    headers.append("set-cookie", setCookie);
  }

  return new Response(body, {
    headers,
    status,
  });
}
