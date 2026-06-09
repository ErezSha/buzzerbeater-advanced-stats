import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  stickyColumn,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeagueData } from "@/components/dashboard/use-league-data";
import type { LeaguePlayerMetricSummary } from "@/domain/types";
import type { LeagueDataTier, LeagueSegment } from "@/lib/api-types";
import { formatInteger, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

const COLUMN_HEADERS = [
  "Player",
  "Team",
  "G",
  "Min",
  "Pts",
  "TS%",
  "eFG%",
  "TOV%",
  "USG%",
  "AST%",
  "TRB%",
  "STL%",
  "BLK%",
  "GmSc",
];

function LeagueTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-1 h-4 w-72" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMN_HEADERS.map((h, j) => (
                <TableHead key={h} className={cn(j === 0 && stickyColumn)}>
                  <span className="text-muted-foreground">{h}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <TableRow key={i} className="animate-pulse">
                {COLUMN_HEADERS.map((h, j) => (
                  <TableCell key={h} className={cn(j === 0 && stickyColumn)}>
                    <Skeleton
                      className={cn(
                        "h-4 bg-muted-foreground/15",
                        j === 0 ? "w-28" : j === 1 ? "w-20" : "w-10",
                      )}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

type LeaderColumnId =
  | "games"
  | "minutes"
  | "points"
  | "ts"
  | "efg"
  | "turnoverPercentage"
  | "usageRate"
  | "assistPercentage"
  | "reboundPercentage"
  | "stealPercentage"
  | "blockPercentage"
  | "gameScoreAverage";

type LeaderMap = Record<LeaderColumnId, Set<string>>;

const leaderValueClass = "font-bold text-primary";

const leaderColumns: Array<{
  id: LeaderColumnId;
  getValue: (p: LeaguePlayerMetricSummary) => number | null | undefined;
}> = [
  { id: "games", getValue: (p) => p.games },
  { id: "minutes", getValue: (p) => p.minutes },
  { id: "points", getValue: (p) => p.points },
  { id: "ts", getValue: (p) => p.shooting.trueShootingPercentage },
  { id: "efg", getValue: (p) => p.shooting.effectiveFieldGoalPercentage },
  { id: "turnoverPercentage", getValue: (p) => p.turnoverPercentage },
  { id: "usageRate", getValue: (p) => p.usageRate },
  { id: "assistPercentage", getValue: (p) => p.assistPercentage },
  { id: "reboundPercentage", getValue: (p) => p.reboundPercentage },
  { id: "stealPercentage", getValue: (p) => p.stealPercentage },
  { id: "blockPercentage", getValue: (p) => p.blockPercentage },
  { id: "gameScoreAverage", getValue: (p) => p.gameScoreAverage },
];

function buildLeaderMap(players: LeaguePlayerMetricSummary[]): LeaderMap {
  return leaderColumns.reduce((leaders, column) => {
    const validRows = players
      .map((p) => ({ playerId: p.playerId, value: column.getValue(p) }))
      .filter(
        (e): e is { playerId: string; value: number } =>
          typeof e.value === "number" && Number.isFinite(e.value),
      );

    if (validRows.length === 0) {
      leaders[column.id] = new Set();
      return leaders;
    }

    const maxValue = Math.max(...validRows.map((e) => e.value));
    leaders[column.id] = new Set(
      validRows.filter((e) => e.value === maxValue).map((e) => e.playerId),
    );
    return leaders;
  }, {} as LeaderMap);
}

function LeaderStat({
  isLeader,
  value,
}: {
  isLeader: boolean;
  value: React.ReactNode;
}) {
  return <span className={cn(isLeader && leaderValueClass)}>{value}</span>;
}

function NaStat({ tier }: { tier: LeagueDataTier }) {
  if (tier === "full") return <span>—</span>;
  return <span className="text-muted-foreground">—</span>;
}

export function LeagueTabContent() {
  const { data, isLoading, isFetchingFull, fetchFull, error } = useLeagueData();

  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "gameScoreAverage", desc: true },
  ]);
  const [minGames, setMinGames] = React.useState(0);
  const [minMinutes, setMinMinutes] = React.useState(0);
  const [segment, setSegment] = React.useState<LeagueSegment>("all");

  const tier = data?.tier ?? "lightweight";

  // The table renders no seasonStat-derived columns today, so segment-specific
  // seasonStat handling lives entirely in the data layer (seasonStat is only
  // populated for the regular segment). If season-stat columns are ever added,
  // they must render for the `regular` segment only.
  const rows = React.useMemo(() => {
    const players = data?.players?.[segment] ?? [];
    return players.filter((p) => {
      if (p.games < minGames) return false;
      return (p.minutes ?? 0) >= minMinutes;
    });
  }, [data, segment, minGames, minMinutes]);

  const leaders = React.useMemo(() => buildLeaderMap(rows), [rows]);

  const columns = React.useMemo<ColumnDef<LeaguePlayerMetricSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Player",
        cell: ({ row }) => (
          <div className="max-w-[6rem] sm:max-w-[12rem]">
            <div
              className="truncate font-semibold text-primary"
              title={row.original.name}
            >
              {row.original.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.position ?? "—"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "teamName",
        header: "Team",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.teamName}</span>
        ),
      },
      {
        accessorKey: "games",
        header: "G",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.games.has(row.original.playerId)}
            value={formatInteger(row.original.games)}
          />
        ),
      },
      {
        accessorKey: "minutes",
        header: "Min",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.minutes.has(row.original.playerId)}
            value={formatNumber(row.original.minutes)}
          />
        ),
      },
      {
        accessorKey: "points",
        header: "Pts",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.points.has(row.original.playerId)}
            value={formatInteger(row.original.points)}
          />
        ),
      },
      {
        accessorFn: (row) => row.shooting.trueShootingPercentage,
        id: "ts",
        header: "TS%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.ts.has(row.original.playerId)}
            value={formatPercent(row.original.shooting.trueShootingPercentage)}
          />
        ),
      },
      {
        accessorFn: (row) => row.shooting.effectiveFieldGoalPercentage,
        id: "efg",
        header: "eFG%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.efg.has(row.original.playerId)}
            value={formatPercent(
              row.original.shooting.effectiveFieldGoalPercentage,
            )}
          />
        ),
      },
      {
        accessorKey: "turnoverPercentage",
        header: "TOV%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.turnoverPercentage.has(row.original.playerId)}
            value={formatPercent(row.original.turnoverPercentage)}
          />
        ),
      },
      {
        accessorKey: "usageRate",
        header: "USG%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.usageRate.has(row.original.playerId)}
            value={formatPercent(row.original.usageRate)}
          />
        ),
      },
      {
        accessorKey: "assistPercentage",
        header: "AST%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.assistPercentage.has(row.original.playerId)}
            value={formatPercent(row.original.assistPercentage)}
          />
        ),
      },
      {
        accessorKey: "reboundPercentage",
        header: "TRB%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.reboundPercentage.has(row.original.playerId)}
            value={formatPercent(row.original.reboundPercentage)}
          />
        ),
      },
      {
        accessorKey: "stealPercentage",
        header: "STL%",
        cell: ({ row }) =>
          tier === "full" ? (
            <LeaderStat
              isLeader={leaders.stealPercentage.has(row.original.playerId)}
              value={formatPercent(row.original.stealPercentage)}
            />
          ) : (
            <NaStat tier={tier} />
          ),
      },
      {
        accessorKey: "blockPercentage",
        header: "BLK%",
        cell: ({ row }) =>
          tier === "full" ? (
            <LeaderStat
              isLeader={leaders.blockPercentage.has(row.original.playerId)}
              value={formatPercent(row.original.blockPercentage)}
            />
          ) : (
            <NaStat tier={tier} />
          ),
      },
      {
        accessorKey: "gameScoreAverage",
        header: "GmSc",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.gameScoreAverage.has(row.original.playerId)}
            value={formatNumber(row.original.gameScoreAverage)}
          />
        ),
      },
    ],
    [leaders, tier],
  );

  // TanStack Table intentionally returns stateful helpers from this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  if (isLoading) {
    return <LeagueTableSkeleton />;
  }

  if (error) {
    return (
      <EmptyState title="League data unavailable" message={error.message} />
    );
  }

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const playoffEmpty =
    segment === "playoff" && (data?.players.playoff.length ?? 0) === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>League</CardTitle>
            <CardDescription>
              Advanced stats for all players across all 16 teams.
              {tier === "lightweight" && (
                <>
                  {" "}
                  STL%, BLK%, and the playoff/combined splits require the full
                  data fetch.
                </>
              )}
            </CardDescription>
          </div>
          {tier === "lightweight" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isFetchingFull}
              onClick={fetchFull}
            >
              {isFetchingFull ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching…
                </>
              ) : (
                "Fetch full stats"
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
          <Tabs
            value={segment}
            onValueChange={(value) => {
              setSegment(value as LeagueSegment);
              table.setPageIndex(0);
            }}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="regular">Regular Season</TabsTrigger>
              <TabsTrigger value="playoff">Playoffs</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="flex items-center gap-2">
            Min games
            <input
              className="h-8 w-20 rounded-md border bg-background px-2"
              min={0}
              type="number"
              value={minGames}
              onChange={(e) => {
                setMinGames(Number(e.target.value));
                table.setPageIndex(0);
              }}
            />
          </label>
          <label className="flex items-center gap-2">
            Min minutes
            <input
              className="h-8 w-24 rounded-md border bg-background px-2"
              min={0}
              type="number"
              value={minMinutes}
              onChange={(e) => {
                setMinMinutes(Number(e.target.value));
                table.setPageIndex(0);
              }}
            />
          </label>
          <Badge variant="outline">{rows.length} players</Badge>
        </div>

        {playoffEmpty ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center">
            <div>
              <div className="font-medium">No playoff games yet</div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {tier === "lightweight"
                  ? "Playoff and combined splits are only available after fetching the full stats."
                  : "No league playoff box scores were found for this season."}
              </p>
            </div>
            {tier === "lightweight" && (
              <Button
                size="sm"
                variant="outline"
                disabled={isFetchingFull}
                onClick={fetchFull}
              >
                {isFetchingFull ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching…
                  </>
                ) : (
                  "Fetch full stats"
                )}
              </Button>
            )}
          </div>
        ) : (
          <>
            <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, j) => (
                  <TableHead
                    key={header.id}
                    className={cn(j === 0 && stickyColumn)}
                  >
                    <button
                      className="inline-flex items-center gap-1 font-medium"
                      onClick={header.column.getToggleSortingHandler()}
                      type="button"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {header.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                      ) : null}
                      {header.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="h-3 w-3" aria-hidden="true" />
                      ) : null}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell, j) => (
                  <TableCell
                    key={cell.id}
                    className={cn(j === 0 && stickyColumn)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pageIndex + 1} of {pageCount || 1} &mdash; {rows.length} total
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
