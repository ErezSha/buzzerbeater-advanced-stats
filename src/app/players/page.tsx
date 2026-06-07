import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PlayerScoutingForm } from "@/components/player-scouting-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PlayersIndexPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Single-player scouting
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              Scout a Player
            </h1>
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
          <CardHeader>
            <CardTitle>Transfer Market and Scouting View</CardTitle>
            <CardDescription>
              Enter a player id to pull live BBAPI data, derive the current advanced stats we can support, and save a snapshot for next time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerScoutingForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
