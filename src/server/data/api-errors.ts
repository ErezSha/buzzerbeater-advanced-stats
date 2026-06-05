import { isBbapiError } from "@/server/bbapi/errors";
import type { ApiErrorShape } from "@/lib/api-types";

export function toApiError(error: unknown): ApiErrorShape {
  if (isBbapiError(error)) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  return {
    code: "ServerError",
    message: "The dashboard could not be loaded right now.",
    retryable: true,
  };
}
