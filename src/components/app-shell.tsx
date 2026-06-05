import { RefreshCw, ShieldCheck } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AppShell() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Private BBAPI dashboard
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              BuzzerBeater Advanced Stats
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-md border bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">Season</span>{" "}
              <span className="font-medium">Current</span>
            </div>
            <div className="rounded-md border bg-card px-3 py-2 text-sm">
              <span className="text-muted-foreground">Refresh</span>{" "}
              <span className="font-medium">Not connected</span>
            </div>
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </header>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Team
                </div>
                <div className="mt-1 font-semibold">Awaiting BBAPI data</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Source
                </div>
                <div className="mt-1 font-semibold">Server-side only</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Milestone
                </div>
                <div className="mt-1 font-semibold">Foundation scaffold</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <DashboardTabs />
      </div>
    </main>
  );
}
