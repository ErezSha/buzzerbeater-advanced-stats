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

interface PlayersTabContentProps {
  data: DashboardViewModel | null;
  isLoading: boolean;
}

const columns: ColumnDef<PlayerMetricSummary>[] = [
  {
    accessorKey: "name",
    header: "Player",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.position ?? "No position"} / {row.original.rosterStatus}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "games",
    header: "G",
    cell: ({ row }) => formatInteger(row.original.games),
  },
  {
    accessorKey: "minutes",
    header: "Min",
    cell: ({ row }) => formatNumber(row.original.minutes),
  },
  {
    accessorKey: "points",
    header: "Pts",
    cell: ({ row }) => formatInteger(row.original.points),
  },
  {
    accessorFn: (row) => row.shooting.trueShootingPercentage,
    id: "ts",
    header: "TS%",
    cell: ({ row }) => formatPercent(row.original.shooting.trueShootingPercentage),
  },
  {
    accessorFn: (row) => row.shooting.effectiveFieldGoalPercentage,
    id: "efg",
    header: "eFG%",
    cell: ({ row }) => formatPercent(row.original.shooting.effectiveFieldGoalPercentage),
  },
  {
    accessorKey: "turnoverPercentage",
    header: "TOV%",
    cell: ({ row }) => formatPercent(row.original.turnoverPercentage),
  },
  {
    accessorKey: "gameScoreAverage",
    header: "GmSc",
    cell: ({ row }) => formatNumber(row.original.gameScoreAverage),
  },
];

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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Active roster
          </label>
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
