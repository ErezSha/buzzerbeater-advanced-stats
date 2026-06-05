"use client";

import { Activity, BarChart3, BookOpen, CalendarDays, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const playerRows = [
  ["Wing scorer", "SG", "18.4", "58.1%", "24.0%"],
  ["Glass cleaner", "PF", "10.9", "61.3%", "16.2%"],
  ["Lead guard", "PG", "13.2", "54.7%", "21.5%"],
];

const gameRows = [
  ["Last match", "Win", "+9", "101.8"],
  ["Previous", "Loss", "-4", "96.2"],
  ["Three back", "Win", "+13", "104.4"],
];

export function DashboardTabs() {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
        <TabsTrigger value="overview">
          <Activity className="h-4 w-4" aria-hidden="true" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="players">
          <Users className="h-4 w-4" aria-hidden="true" />
          Players
        </TabsTrigger>
        <TabsTrigger value="games">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Games
        </TabsTrigger>
        <TabsTrigger value="trends">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Trends
        </TabsTrigger>
        <TabsTrigger value="glossary">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Glossary
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Team Snapshot</CardTitle>
              <CardDescription>
                Placeholder data until the BBAPI server layer lands.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              {[
                ["Record", "12-7"],
                ["eFG%", "52.4"],
                ["TOV%", "13.8"],
                ["Pace", "98.6"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-2xl font-semibold">{value}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Readiness</CardTitle>
              <CardDescription>Milestone 1 scaffold status.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Next.js</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="outline">Tailwind</Badge>
              <Badge variant="warning">Static shell</Badge>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="players">
        <Card>
          <CardHeader>
            <CardTitle>Players Preview</CardTitle>
            <CardDescription>
              The real table will use TanStack Table with BBAPI-derived metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Pos</TableHead>
                  <TableHead>PTS</TableHead>
                  <TableHead>TS%</TableHead>
                  <TableHead>USG%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerRows.map((row) => (
                  <TableRow key={row[0]}>
                    {row.map((cell) => (
                      <TableCell key={cell}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="games">
        <Card>
          <CardHeader>
            <CardTitle>Recent Games Preview</CardTitle>
            <CardDescription>
              Finished match details will attach box score and four-factor data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>ORtg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameRows.map((row) => (
                  <TableRow key={row[0]}>
                    {row.map((cell) => (
                      <TableCell key={cell}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trends">
        <Card>
          <CardHeader>
            <CardTitle>Trend Surface</CardTitle>
            <CardDescription>
              Recharts will render rolling form, margin, possession, ORtg, and
              DRtg trends here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-56 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Chart scaffold ready for live data.
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="glossary">
        <Card>
          <CardHeader>
            <CardTitle>Glossary Surface</CardTitle>
            <CardDescription>
              Implemented formulas will be searchable once metrics land.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {["eFG%", "TS%", "Game Score"].map((metric) => (
              <div key={metric} className="rounded-md border p-3">
                <div className="font-medium">{metric}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Formula and interpretation note placeholder.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
