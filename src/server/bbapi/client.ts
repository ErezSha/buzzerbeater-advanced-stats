import { getBbapiConfig, type BbapiConfig } from "@/server/bbapi/config";
import {
  BbapiError,
  BbapiEndpointName,
  createHttpError,
  createNetworkError,
  isBbapiError,
} from "@/server/bbapi/errors";
import {
  BBAPI_BASE_URL,
  buildBbapiUrl,
  type BbapiDataEndpoint,
  type BbapiRequestParams,
} from "@/server/bbapi/endpoints";
import {
  parseBbapiXml,
  throwIfBbapiError,
  type BbapiXmlDocument,
} from "@/server/bbapi/xml";

export interface BbapiClient {
  login(): Promise<void>;
  logout(): Promise<void>;
  requestPage(
    endpoint: BbapiDataEndpoint,
    params?: BbapiRequestParams,
  ): Promise<BbapiXmlDocument>;
}

export type BbapiFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export interface CreateBbapiClientOptions {
  readonly config?: BbapiConfig;
  readonly fetcher?: BbapiFetch;
  readonly baseUrl?: string;
}

export function createBbapiClient(
  options: CreateBbapiClientOptions = {},
): BbapiClient {
  return new DefaultBbapiClient(options);
}

class DefaultBbapiClient implements BbapiClient {
  #baseUrl: string;
  #config: BbapiConfig;
  #cookieHeader: string | null = null;
  #fetcher: BbapiFetch;
  #loggedIn = false;

  constructor(options: CreateBbapiClientOptions) {
    this.#baseUrl = options.baseUrl ?? BBAPI_BASE_URL;
    this.#config = options.config ?? getBbapiConfig();
    this.#fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  async login(): Promise<void> {
    const params: BbapiRequestParams = {
      login: this.#config.login,
      code: this.#config.securityCode,
      secondteam: this.#config.secondTeam ? 1 : undefined,
    };

    await this.#request("login.aspx", params);
    this.#loggedIn = true;
  }

  async logout(): Promise<void> {
    if (!this.#loggedIn && !this.#cookieHeader) {
      return;
    }

    try {
      await this.#request("logout.aspx");
    } finally {
      this.#cookieHeader = null;
      this.#loggedIn = false;
    }
  }

  async requestPage(
    endpoint: BbapiDataEndpoint,
    params: BbapiRequestParams = {},
  ): Promise<BbapiXmlDocument> {
    if (!this.#loggedIn) {
      await this.login();
    }

    try {
      return await this.#request(endpoint, params);
    } catch (error) {
      if (!this.#shouldRetryWithFreshLogin(error)) {
        throw error;
      }

      this.#cookieHeader = null;
      this.#loggedIn = false;
      await this.login();
      return this.#request(endpoint, params);
    }
  }

  async #request(
    endpoint: BbapiEndpointName,
    params: BbapiRequestParams = {},
  ): Promise<BbapiXmlDocument> {
    const url = buildBbapiUrl(endpoint, params, this.#baseUrl);
    let response: Response;

    try {
      response = await this.#fetcher(url, {
        cache: "no-store",
        headers: this.#buildHeaders(),
        method: "GET",
      });
    } catch (error) {
      throw createNetworkError(endpoint, error);
    }

    this.#storeResponseCookies(response);

    if (!response.ok) {
      throw createHttpError(endpoint, response.status);
    }

    const xml = await response.text();
    const document = parseBbapiXml(xml, endpoint);
    throwIfBbapiError(document, endpoint);
    return document;
  }

  #buildHeaders(): Headers {
    const headers = new Headers();

    if (this.#cookieHeader) {
      headers.set("Cookie", this.#cookieHeader);
    }

    return headers;
  }

  #shouldRetryWithFreshLogin(error: unknown): error is BbapiError {
    return isBbapiError(error) && error.code === "NotAuthorized";
  }

  #storeResponseCookies(response: Response): void {
    const setCookieHeaders = extractSetCookieHeaders(response.headers);

    if (setCookieHeaders.length === 0) {
      return;
    }

    this.#cookieHeader = mergeCookieHeader(
      this.#cookieHeader,
      setCookieHeaders,
    );
  }
}

function extractSetCookieHeaders(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  const setCookieHeaders = headersWithCookies.getSetCookie?.();

  if (setCookieHeaders && setCookieHeaders.length > 0) {
    return setCookieHeaders;
  }

  const rawSetCookie = headersWithCookies.raw?.()["set-cookie"];

  if (rawSetCookie && rawSetCookie.length > 0) {
    return rawSetCookie;
  }

  const combinedHeader = headers.get("set-cookie");
  return combinedHeader ? splitCombinedSetCookieHeader(combinedHeader) : [];
}

function splitCombinedSetCookieHeader(header: string): string[] {
  return header.split(/,(?=\s*[^;,\s]+=)/).map((value) => value.trim());
}

function mergeCookieHeader(
  existingHeader: string | null,
  setCookieHeaders: string[],
): string {
  const cookiePairs = new Map<string, string>();

  for (const pair of existingHeader?.split(";") ?? []) {
    const normalizedPair = pair.trim();
    const separatorIndex = normalizedPair.indexOf("=");

    if (separatorIndex > 0) {
      cookiePairs.set(
        normalizedPair.slice(0, separatorIndex),
        normalizedPair.slice(separatorIndex + 1),
      );
    }
  }

  for (const setCookieHeader of setCookieHeaders) {
    const pair = setCookieHeader.split(";", 1)[0]?.trim();
    const separatorIndex = pair?.indexOf("=") ?? -1;

    if (pair && separatorIndex > 0) {
      cookiePairs.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
    }
  }

  return Array.from(cookiePairs)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
