import Link from "next/link";
import { ArrowLeftRight, History, ShieldCheck } from "lucide-react";
import type { PlayerScoutingSnapshot, SinglePlayerAnalysis } from "@/domain/types";
import { PlayerScoutingForm } from "@/components/player-scouting-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  formatDateTime,
  formatInteger,
  formatNumber,
  formatPercent,
} from "@/lib/format";

export function PlayerScoutingView({
  analysis,
}: {
  analysis: SinglePlayerAnalysis;
}) {
  const previous = analysis.previousSnapshot;
  const { summary, player } = analysis;
  const games = summary.games;

  function perGame(total: number | null): string {
    if (!games || total === null) return "—";
    return formatNumber(total / games);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Single-player scouting
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Scout Another Player</CardTitle>
            <CardDescription>
              Enter any BuzzerBeater player id to fetch live data and save a scouting snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerScoutingForm initialPlayerId={player.id} />
          </CardContent>
        </Card>

        {/* Player identity box */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{player.name}</h2>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline">#{player.id}</Badge>
                  <Badge variant="outline">{analysis.ownerTeam.name}</Badge>
                  <Badge variant={player.forSale ? "warning" : "secondary"}>
                    {player.forSale ? "Transfer Market" : "Not For Sale"}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Pulled {formatDateTime(analysis.refreshedAt)}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <MiniStat label="Age" value={formatInteger(player.age)} />
              <MiniStat label="Nationality" value={player.nationalityName ?? "—"} />
              <MiniStat label="Potential" value={formatInteger(player.potential)} />
              <MiniStat label="Games Scouted" value={formatInteger(analysis.boxScoreCount)} />
              <MiniStat label="Salary" value={formatInteger(player.salary)} />
              {analysis.ownerTeam.leagueName && (
                <MiniStat
                  label="League"
                  value={[analysis.ownerTeam.leagueName, analysis.ownerTeam.countryName].filter(Boolean).join(" - ")}
                  note={analysis.ownerTeam.leagueLevel ? `Level ${analysis.ownerTeam.leagueLevel}` : undefined}
                />
              )}
            </div>

            {/* TODO: BB BBAPI does not expose skill ratings for players you don't own, even when for sale */}
          </CardContent>
        </Card>

        {/* Season snapshot + coverage */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Current Season</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <MiniStat label="Game Shape" value={formatInteger(player.gameShape)} />
              <MiniStat
                label="Season Rating"
                value={formatNumber(summary.seasonStat?.rating)}
                note={summary.seasonStat?.rating == null ? "BB's own rating — not yet available for this player" : undefined}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <CoverageRow label="Finished matches scanned" value={formatInteger(analysis.finishedMatchCount)} />
              <CoverageRow label="Box scores with player rows" value={formatInteger(analysis.boxScoreCount)} />
              <CoverageRow label="Owner team" value={analysis.ownerTeam.name} />
              <CoverageRow
                label="Last saved snapshot"
                value={previous ? formatDateTime(previous.savedAt) : "No earlier snapshot"}
              />
            </CardContent>
          </Card>
        </div>

        {/* Advanced statistics */}
        {games > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Advanced Statistics</CardTitle>
              <CardDescription>Per-game averages and shooting splits from {games} scouted game{games !== 1 ? "s" : ""}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Per Game</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  <MiniStat label="PPG" value={perGame(summary.points)} />
                  <MiniStat label="RPG" value={perGame(summary.rebounds)} />
                  <MiniStat label="APG" value={perGame(summary.assists)} />
                  <MiniStat label="SPG" value={perGame(summary.steals)} />
                  <MiniStat label="BPG" value={perGame(summary.blocks)} />
                  <MiniStat label="TPG" value={perGame(summary.turnovers)} />
                  <MiniStat label="MPG" value={perGame(summary.minutes)} />
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Shooting</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <MiniStat label="FG%" value={formatPercent(summary.shooting.fieldGoalPercentage)} />
                  <MiniStat label="2P%" value={formatPercent(summary.shooting.twoPointPercentage)} />
                  <MiniStat label="3P%" value={formatPercent(summary.shooting.threePointPercentage)} />
                  <MiniStat label="FT%" value={formatPercent(summary.shooting.freeThrowPercentage)} />
                  <MiniStat label="eFG%" value={formatPercent(summary.shooting.effectiveFieldGoalPercentage)} />
                  <MiniStat label="TS%" value={formatPercent(summary.shooting.trueShootingPercentage)} />
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Rates</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <MiniStat label="TOV%" value={formatPercent(summary.turnoverPercentage)} />
                  <MiniStat label="Usage%" value={formatPercent(summary.usageRate)} />
                  <MiniStat label="GmSc" value={formatNumber(summary.gameScoreAverage)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Last seen comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" aria-hidden="true" />
              Last Seen Comparison
            </CardTitle>
            <CardDescription>
              Latest live pull vs. the previous saved scouting snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previous ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SnapshotColumn title="Current" stamp={analysis.refreshedAt} snapshot={{
                  savedAt: analysis.refreshedAt,
                  player,
                  ownerTeam: analysis.ownerTeam,
                  summary,
                }} />
                <SnapshotColumn
                  title="Last Seen"
                  stamp={previous.savedAt}
                  snapshot={previous}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                No previous scouting snapshot exists for this player yet. The current view has been saved for next time.
              </div>
            )}
          </CardContent>
        </Card>

        {previous ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                Quick Changes
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ChangeStat label="Salary" current={formatInteger(player.salary)} previous={formatInteger(previous.player.salary)} />
              <ChangeStat label="DMI" current={formatInteger(player.dmi)} previous={formatInteger(previous.player.dmi)} />
              <ChangeStat label="Game Shape" current={formatInteger(player.gameShape)} previous={formatInteger(previous.player.gameShape)} />
              <ChangeStat label="Season Rating" current={formatNumber(summary.seasonStat?.rating)} previous={formatNumber(previous.summary.seasonStat?.rating)} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}


function SnapshotColumn({
  title,
  stamp,
  snapshot,
}: {
  title: string;
  stamp: string;
  snapshot: PlayerScoutingSnapshot;
}) {
  const g = snapshot.summary.games;

  function pg(total: number | null): string {
    if (!g || total === null) return "—";
    return formatNumber(total / g);
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{formatDateTime(stamp)}</div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <MiniStat label="Age" value={formatInteger(snapshot.player.age)} />
        <MiniStat label="Salary" value={formatInteger(snapshot.player.salary)} />
        <MiniStat label="Potential" value={formatInteger(snapshot.player.potential)} />
        <MiniStat label="Games" value={formatInteger(snapshot.summary.games)} />
        <MiniStat label="PPG" value={pg(snapshot.summary.points)} />
        <MiniStat label="RPG" value={pg(snapshot.summary.rebounds)} />
        <MiniStat label="APG" value={pg(snapshot.summary.assists)} />
        <MiniStat label="TS%" value={formatPercent(snapshot.summary.shooting.trueShootingPercentage)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border px-2.5 py-2">
      <div className="text-[10px] uppercase leading-tight text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-[10px] italic text-muted-foreground">{note}</div>}
    </div>
  );
}

function CoverageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function ChangeStat({
  label,
  current,
  previous,
}: {
  label: string;
  current: string;
  previous: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm text-muted-foreground">Current</div>
      <div className="font-semibold">{current}</div>
      <div className="mt-2 text-sm text-muted-foreground">Last seen</div>
      <div className="font-semibold">{previous}</div>
    </div>
  );
}
