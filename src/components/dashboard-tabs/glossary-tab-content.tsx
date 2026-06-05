"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { glossaryEntries } from "@/domain/glossary";

export function GlossaryTabContent() {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const entries = glossaryEntries.filter((entry) => {
    if (!normalizedQuery) {
      return true;
    }

    return [entry.name, entry.formula, entry.interpretation, entry.availability]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Glossary</CardTitle>
        <CardDescription>
          Implemented MVP metrics, formulas, and data availability notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Search metrics
          <input
            className="h-9 rounded-md border bg-background px-3"
            placeholder="eFG, turnovers, possessions..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {entries.length === 0 ? (
          <EmptyState
            title="No metrics found"
            message="Try a formula name, stat abbreviation, or availability term."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-md border p-3">
                <div className="font-semibold">{entry.name}</div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">Formula: </span>
                  {entry.formula}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {entry.interpretation}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {entry.availability}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
