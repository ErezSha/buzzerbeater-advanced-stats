import { isBbapiError } from "@/server/bbapi/errors";
import type { ApiErrorShape } from "@/lib/api-types";

export function toApiError(error: unknown): ApiErrorShape {
  if (isBbapiError(error)) {
    // Log the endpoint + raw BBAPI message so we can see which call failed
    // (e.g. during a live match) — toApiError is the single funnel for all
    // surfaced BBAPI failures.
    console.error(
      `[bbapi] ${error.code} on ${error.endpoint ?? "unknown endpoint"}` +
        (error.bbapiMessage ? ` (bbapiMessage: ${error.bbapiMessage})` : ""),
    );

    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      endpoint: error.endpoint,
      bbapiMessage: error.bbapiMessage,
    };
  }

  console.error("[bbapi] non-BBAPI error while loading dashboard", error);

  return {
    code: "ServerError",
    message: "The dashboard could not be loaded right now.",
    retryable: true,
  };
}
