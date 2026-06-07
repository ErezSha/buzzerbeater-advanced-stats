import { notFound } from "next/navigation";
import { PlayerScoutingView } from "@/components/player-scouting-view";
import { analyzeSinglePlayer } from "@/server/data/analyze-single-player";

interface PlayerPageContext {
  params: Promise<{
    playerId: string;
  }>;
}

export default async function PlayerPage(context: PlayerPageContext) {
  const { playerId } = await context.params;

  if (!playerId?.trim()) {
    notFound();
  }

  const analysis = await analyzeSinglePlayer(playerId);

  return <PlayerScoutingView analysis={analysis} />;
}
