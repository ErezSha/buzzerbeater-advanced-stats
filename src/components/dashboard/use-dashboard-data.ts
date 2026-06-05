"use client";

import * as React from "react";
import type {
  ApiErrorShape,
  DashboardApiResponse,
  DashboardViewModel,
  RefreshApiResponse,
} from "@/lib/api-types";

interface DashboardDataState {
  data: DashboardViewModel | null;
  error: ApiErrorShape | null;
  refreshedAt: string | null;
  cacheSource: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

async function readResponse<T extends DashboardApiResponse | RefreshApiResponse>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T;
}

export function useDashboardData(): DashboardDataState {
  const [data, setData] = React.useState<DashboardViewModel | null>(null);
  const [error, setError] = React.useState<DashboardDataState["error"]>(null);
  const [refreshedAt, setRefreshedAt] = React.useState<string | null>(null);
  const [cacheSource, setCacheSource] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const applyResponse = React.useCallback((payload: DashboardApiResponse) => {
    if (payload.ok) {
      setData(payload.data);
      setError(null);
      setRefreshedAt(payload.refreshedAt);
      setCacheSource(payload.cacheStatus.source);
      return;
    }

    setError(payload.error);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const payload = await readResponse<DashboardApiResponse>(
          await fetch("/api/dashboard"),
        );
        if (!cancelled) {
          applyResponse(payload);
        }
      } catch {
        if (!cancelled) {
          setError({
            code: "ServerError",
            message: "The dashboard API could not be reached.",
            retryable: true,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [applyResponse]);

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      const payload = await readResponse<RefreshApiResponse>(
        await fetch("/api/refresh", { method: "POST" }),
      );
      applyResponse(payload);
    } catch {
      setError({
        code: "ServerError",
        message: "Manual refresh could not reach the dashboard API.",
        retryable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [applyResponse]);

  return {
    data,
    error,
    refreshedAt,
    cacheSource,
    isLoading,
    isRefreshing,
    refresh,
  };
}
