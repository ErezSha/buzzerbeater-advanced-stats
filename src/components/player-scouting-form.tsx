"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlayerScoutingForm({
  initialPlayerId = "",
}: {
  initialPlayerId?: string;
}) {
  const router = useRouter();
  const [playerId, setPlayerId] = React.useState(initialPlayerId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = playerId.trim();

    if (!normalized) {
      return;
    }

    router.push(`/players/${encodeURIComponent(normalized)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <label className="flex-1">
        <span className="mb-1 block text-sm text-muted-foreground">
          Player ID
        </span>
        <input
          value={playerId}
          onChange={(event) => setPlayerId(event.target.value)}
          placeholder="55713639"
          className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <Button type="submit" className="sm:mt-6">
        <Search className="h-4 w-4" aria-hidden="true" />
        Scout Player
      </Button>
    </form>
  );
}
