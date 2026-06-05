import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const glossaryMetrics = ["eFG%", "TS%", "Game Score"];

export function GlossaryTabContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Glossary Surface</CardTitle>
        <CardDescription>
          Implemented formulas will be searchable once metrics land.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {glossaryMetrics.map((metric) => (
          <div key={metric} className="rounded-md border p-3">
            <div className="font-medium">{metric}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Formula and interpretation note placeholder.
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
