import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerMetricSummary } from "@/domain/types";
import type { DashboardViewModel } from "@/lib/api-types";
import { formatInteger, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlayersTabContentProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
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
  getValue: (player: PlayerMetricSummary) => number | null | undefined;
}> = [
  { id: "games", getValue: (player) => player.games },
  { id: "minutes", getValue: (player) => player.minutes },
  { id: "points", getValue: (player) => player.points },
  { id: "ts", getValue: (player) => player.shooting.trueShootingPercentage },
  {
    id: "efg",
    getValue: (player) => player.shooting.effectiveFieldGoalPercentage,
  },
  { id: "turnoverPercentage", getValue: (player) => player.turnoverPercentage },
  { id: "usageRate", getValue: (player) => player.usageRate },
  { id: "assistPercentage", getValue: (player) => player.assistPercentage },
  { id: "reboundPercentage", getValue: (player) => player.reboundPercentage },
  { id: "stealPercentage", getValue: (player) => player.stealPercentage },
  { id: "blockPercentage", getValue: (player) => player.blockPercentage },
  { id: "gameScoreAverage", getValue: (player) => player.gameScoreAverage },
];

function buildLeaderMap(players: PlayerMetricSummary[]): LeaderMap {
  return leaderColumns.reduce((leaders, column) => {
    const validRows = players
      .map((player) => ({
        playerId: player.playerId,
        value: column.getValue(player),
      }))
      .filter(
        (entry): entry is { playerId: string; value: number } =>
          typeof entry.value === "number" && Number.isFinite(entry.value),
      );

    if (validRows.length === 0) {
      leaders[column.id] = new Set();
      return leaders;
    }

    const maxValue = Math.max(...validRows.map((entry) => entry.value));
    leaders[column.id] = new Set(
      validRows
        .filter((entry) => entry.value === maxValue)
        .map((entry) => entry.playerId),
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

export function PlayersTabContent({ data, isLoading }: PlayersTabContentProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "gameScoreAverage", desc: true },
  ]);
  const [activeOnly, setActiveOnly] = React.useState(true);
  const [minGames, setMinGames] = React.useState(0);
  const [minMinutes, setMinMinutes] = React.useState(0);

  const rows = React.useMemo(() => {
    const players = data?.derived.players ?? [];
    return players.filter((player) => {
      if (activeOnly && player.rosterStatus !== "active") {
        return false;
      }

      if (player.games < minGames) {
        return false;
      }

      return (player.minutes ?? 0) >= minMinutes;
    });
  }, [activeOnly, data, minGames, minMinutes]);

  const leaders = React.useMemo(() => buildLeaderMap(rows), [rows]);

  const columns = React.useMemo<ColumnDef<PlayerMetricSummary>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Player",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-primary">
              {row.original.name}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.position ?? "No position"} /{" "}
              {row.original.rosterStatus}
            </div>
          </div>
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
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.stealPercentage.has(row.original.playerId)}
            value={formatPercent(row.original.stealPercentage)}
          />
        ),
      },
      {
        accessorKey: "blockPercentage",
        header: "BLK%",
        cell: ({ row }) => (
          <LeaderStat
            isLeader={leaders.blockPercentage.has(row.original.playerId)}
            value={formatPercent(row.original.blockPercentage)}
          />
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
    [leaders],
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
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
        <CardDescription>
          Sortable advanced stats with active roster and sample-size filters.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
          {/*<label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Active roster
          </label>*/}
          <label className="flex items-center gap-2">
            Min games
            <input
              className="h-8 w-20 rounded-md border bg-background px-2"
              min={0}
              type="number"
              value={minGames}
              onChange={(event) => setMinGames(Number(event.target.value))}
            />
          </label>
          <label className="flex items-center gap-2">
            Min minutes
            <input
              className="h-8 w-24 rounded-md border bg-background px-2"
              min={0}
              type="number"
              value={minMinutes}
              onChange={(event) => setMinMinutes(Number(event.target.value))}
            />
          </label>
          <Badge variant="outline">{rows.length} players</Badge>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No players match these filters"
            message="Lower the game or minute threshold, or include inactive roster entries."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
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
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
