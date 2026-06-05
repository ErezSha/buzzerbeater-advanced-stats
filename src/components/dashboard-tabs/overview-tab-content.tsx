import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const snapshotMetrics = [
  ["Record", "12-7"],
  ["eFG%", "52.4"],
  ["TOV%", "13.8"],
  ["Pace", "98.6"],
];

export function OverviewTabContent() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Team Snapshot</CardTitle>
          <CardDescription>
            Placeholder data until the BBAPI server layer lands.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          {snapshotMetrics.map(([label, value]) => (
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
  );
}
