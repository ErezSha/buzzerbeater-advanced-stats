import { notFound } from "next/navigation";
import { PlayerScoutingView } from "@/components/player-scouting-view";
import { analyzeSinglePlayer } from "@/server/data/analyze-single-player";
import { getRequestContext } from "@/server/data/request-context";

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

  const { cache, client } = await getRequestContext();
  const analysis = await analyzeSinglePlayer(playerId, {
    cacheStore: cache,
    client,
  });

  return <PlayerScoutingView analysis={analysis} />;
}
