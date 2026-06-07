"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";

export function AppShell() {
  const dashboard = useDashboardData();
  const team = dashboard.data?.team;
  const season =
    dashboard.data?.matches.find((match) => match.season)?.season ?? "Current";
  const statusLabel = dashboard.isLoading
    ? "Loading"
    : dashboard.isRefreshing
      ? "Syncing"
      : dashboard.cacheSource === "refreshed"
        ? "Refreshed"
        : dashboard.cacheSource === "fresh-cache"
          ? "Cached"
          : dashboard.cacheSource === "local-cache"
            ? "Offline cache"
            : "Not connected";

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              Private BBAPI dashboard
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              BuzzerBeater Advanced Stats
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">Season</span>{" "}
              <span className="font-medium">{season}</span>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">Refresh</span>{" "}
              <span className="font-medium">{statusLabel}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={dashboard.isLoading || dashboard.isRefreshing}
              onClick={() => void dashboard.refresh()}
            >
              <RefreshCw
                className={
                  dashboard.isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
                aria-hidden="true"
              />
              Refresh
            </Button>
            <Link
              href="/players"
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            >
              Scout Player
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {dashboard.error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div>
              <div className="font-medium">{dashboard.error.code}</div>
              <div className="text-muted-foreground">
                {dashboard.error.message}
              </div>
            </div>
          </div>
        ) : null}

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Team
                </div>
                <div className="mt-1 font-semibold">
                  {dashboard.isLoading ? (
                    <Skeleton className="h-5 w-40" />
                  ) : (
                    (team?.name ?? "Awaiting BBAPI data")
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Data Source
                </div>
                <div className="mt-1 font-semibold">Server-side BBAPI</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Last Updated
                </div>
                <div className="mt-1 font-semibold">
                  {formatDateTime(
                    dashboard.refreshedAt ?? dashboard.data?.refreshedAt,
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <DashboardTabs data={dashboard.data} isLoading={dashboard.isLoading} />
      </div>
    </main>
  );
}
