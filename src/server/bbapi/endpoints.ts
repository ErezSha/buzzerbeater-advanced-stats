import type { BbapiEndpointName } from "@/server/bbapi/errors";

export const BBAPI_BASE_URL = "http://bbapi.buzzerbeater.com/";

export type BbapiDataEndpoint = Exclude<
  BbapiEndpointName,
  "login.aspx" | "logout.aspx"
>;

export type BbapiRequestParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export function buildBbapiUrl(
  endpoint: BbapiEndpointName,
  params: BbapiRequestParams = {},
  baseUrl = BBAPI_BASE_URL,
): URL {
  const url = new URL(endpoint, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }

    url.searchParams.set(key, value === true ? "1" : String(value));
  }

  return url;
}
