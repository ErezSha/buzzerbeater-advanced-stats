"use client";

import * as React from "react";
import {
  LEAGUE_CACHE_SCHEMA_VERSION,
  createIdbLeagueCache,
} from "@/lib/client-cache/league-cache";
import type {
  ApiErrorShape,
  LeagueApiResponse,
  LeagueViewModel,
} from "@/lib/api-types";

interface LeagueDataState {
  data: LeagueViewModel | null;
  error: ApiErrorShape | null;
  refreshedAt: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingFull: boolean;
  fetchFull: () => Promise<void>;
}

const cache = createIdbLeagueCache();

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function useLeagueData(): LeagueDataState {
  const [data, setData] = React.useState<LeagueViewModel | null>(null);
  const [error, setError] = React.useState<ApiErrorShape | null>(null);
  const [refreshedAt, setRefreshedAt] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isFetchingFull, setIsFetchingFull] = React.useState(false);

  const applyResponse = React.useCallback((payload: LeagueApiResponse) => {
    if (payload.ok) {
      setData(payload.data);
      setError(null);
      setRefreshedAt(payload.refreshedAt);
      void cache.write({
        version: LEAGUE_CACHE_SCHEMA_VERSION,
        refreshedAt: payload.refreshedAt,
        data: payload.data,
      });
      return;
    }

    setError(payload.error);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = await cache.read();
      const hasCachedData = Boolean(cached) && !cancelled;

      if (cached && !cancelled) {
        setData(cached.data);
        setRefreshedAt(cached.refreshedAt);
      }

      if (!hasCachedData) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const payload = await readJson<LeagueApiResponse>(
          await fetch("/api/league"),
        );
        if (!cancelled) {
          applyResponse(payload);
        }
      } catch {
        if (!cancelled && !hasCachedData) {
          setError({
            code: "ServerError",
            message: "The league API could not be reached.",
            retryable: true,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [applyResponse]);

  const fetchFull = React.useCallback(async () => {
    setIsFetchingFull(true);

    try {
      const payload = await readJson<LeagueApiResponse>(
        await fetch("/api/league/full", { method: "POST" }),
      );
      applyResponse(payload);
    } catch {
      setError({
        code: "ServerError",
        message: "Full league data fetch could not reach the API.",
        retryable: true,
      });
    } finally {
      setIsFetchingFull(false);
    }
  }, [applyResponse]);

  return {
    data,
    error,
    refreshedAt,
    isLoading,
    isRefreshing,
    isFetchingFull,
    fetchFull,
  };
}
