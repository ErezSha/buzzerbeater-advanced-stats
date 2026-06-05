import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TrendsTabContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Surface</CardTitle>
        <CardDescription>
          Recharts will render rolling form, margin, possession, ORtg, and DRtg
          trends here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          Chart scaffold ready for live data.
        </div>
      </CardContent>
    </Card>
  );
}
