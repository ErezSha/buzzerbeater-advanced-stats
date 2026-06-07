export type BbapiEndpointName =
  | "login.aspx"
  | "logout.aspx"
  | "teaminfo.aspx"
  | "roster.aspx"
  | "schedule.aspx"
  | "boxscore.aspx"
  | "teamstats.aspx"
  | "standings.aspx";

export type BbapiErrorCode =
  | "ConfigurationError"
  | "HttpError"
  | "NetworkError"
  | "XmlParseError"
  | "NotAuthorized"
  | "BoxscoreNotAvailable"
  | "ServerError"
  | "UnknownBbapiError";

export interface BbapiErrorOptions {
  code: BbapiErrorCode;
  message: string;
  retryable: boolean;
  endpoint?: BbapiEndpointName;
  status?: number;
  bbapiMessage?: string;
  cause?: unknown;
}

export class BbapiError extends Error {
  readonly code: BbapiErrorCode;
  readonly retryable: boolean;
  readonly endpoint?: BbapiEndpointName;
  readonly status?: number;
  readonly bbapiMessage?: string;
  readonly cause?: unknown;

  constructor(options: BbapiErrorOptions) {
    super(options.message);
    this.name = "BbapiError";
    this.code = options.code;
    this.retryable = options.retryable;
    this.endpoint = options.endpoint;
    this.status = options.status;
    this.bbapiMessage = options.bbapiMessage;
    this.cause = options.cause;
  }
}

export function isBbapiError(error: unknown): error is BbapiError {
  return error instanceof BbapiError;
}

export function createConfigurationError(missingKeys: string[]): BbapiError {
  return new BbapiError({
    code: "ConfigurationError",
    message: `Missing server BBAPI configuration: ${missingKeys.join(", ")}.`,
    retryable: false,
  });
}

export function createHttpError(
  endpoint: BbapiEndpointName,
  status: number,
): BbapiError {
  return new BbapiError({
    code: "HttpError",
    endpoint,
    message: `BBAPI request failed for ${endpoint} with HTTP ${status}.`,
    retryable: status >= 500,
    status,
  });
}

export function createNetworkError(
  endpoint: BbapiEndpointName,
  cause: unknown,
): BbapiError {
  return new BbapiError({
    code: "NetworkError",
    endpoint,
    message: `BBAPI request failed for ${endpoint} before a response was received.`,
    retryable: true,
    cause,
  });
}

export function createXmlParseError(
  endpoint: BbapiEndpointName,
  cause: unknown,
): BbapiError {
  return new BbapiError({
    code: "XmlParseError",
    endpoint,
    message: `BBAPI returned unreadable XML for ${endpoint}.`,
    retryable: false,
    cause,
  });
}

export function createBbapiResponseError(
  endpoint: BbapiEndpointName,
  bbapiMessage: string,
): BbapiError {
  switch (bbapiMessage) {
    case "NotAuthorized":
      return new BbapiError({
        code: "NotAuthorized",
        endpoint,
        message: "BBAPI authorization failed or the session expired.",
        retryable: true,
        bbapiMessage,
      });
    case "BoxscoreNotAvailable":
      return new BbapiError({
        code: "BoxscoreNotAvailable",
        endpoint,
        message: "Box score is not available yet.",
        retryable: false,
        bbapiMessage,
      });
    case "ServerError":
      return new BbapiError({
        code: "ServerError",
        endpoint,
        message: "BBAPI reported a server error.",
        retryable: true,
        bbapiMessage,
      });
    default:
      return new BbapiError({
        code: "UnknownBbapiError",
        endpoint,
        message: `BBAPI returned an unsupported error: ${bbapiMessage}.`,
        retryable: false,
        bbapiMessage,
      });
  }
}
