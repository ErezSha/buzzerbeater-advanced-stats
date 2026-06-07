import type {
  BoxScore,
  LeaguePlayerMetricSummary,
  NormalizedBbapiData,
} from "@/domain/types";
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

export interface OpponentPlayerSummary {
  name: string;
  position: string | null;
  points: number | null;
  usageRate: number | null;
}

export interface OpponentGameLog {
  matchId: string;
  date: string;
  vsName: string | null;
  teamScore: number | null;
  vsScore: number | null;
  margin: number | null;
  offStrategy: string | null;
  defStrategy: string | null;
  effort: string | null;
  topScorer: OpponentPlayerSummary | null;
  topUsage: OpponentPlayerSummary | null;
}

export interface OpponentScoutData {
  teamId: string;
  games: OpponentGameLog[];
}

export type OpponentApiResponse =
  | { ok: true; data: OpponentScoutData }

export type LeagueDataTier = "lightweight" | "full";

export interface LeagueViewModel {
  players: LeaguePlayerMetricSummary[];
  tier: LeagueDataTier;
}

export type LeagueApiResponse =
  | {
      ok: true;
      data: LeagueViewModel;
      refreshedAt: string;
      cacheStatus: CacheStatus;
    }
  | { ok: false; error: ApiErrorShape };
