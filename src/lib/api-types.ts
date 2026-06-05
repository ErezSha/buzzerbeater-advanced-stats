import type { BoxScore, NormalizedBbapiData } from "@/domain/types";
import type { BbapiErrorCode } from "@/server/bbapi/errors";

export interface CacheStatus {
  source: "fresh-cache" | "refreshed";
  refreshedAt: string;
}

export type DashboardViewModel = NormalizedBbapiData;

export type ApiErrorShape = {
  code: BbapiErrorCode | "NotFound";
  message: string;
  retryable: boolean;
};

export type DashboardApiResponse =
  | {
      ok: true;
      data: DashboardViewModel;
      refreshedAt: string;
      cacheStatus: CacheStatus;
    }
  | { ok: false; error: ApiErrorShape };

export type RefreshApiResponse = DashboardApiResponse;

export type GameApiResponse =
  | {
      ok: true;
      data: BoxScore;
      refreshedAt: string;
      cacheStatus: CacheStatus;
    }
  | { ok: false; error: ApiErrorShape };

export type LogoutApiResponse =
  | { ok: true }
  | { ok: false; error: ApiErrorShape };
