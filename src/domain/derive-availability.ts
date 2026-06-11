import type {
  AvailabilityPlayer,
  AvailabilitySummary,
  Player,
} from "@/domain/types";
import {
  teamStrengthModifier,
  type RosterPlayerAvailability,
} from "@/domain/matchup";
import { isFiniteNumber } from "@/domain/metrics";

/** How many of a team's most-used players count toward the availability signal. */
export const ROTATION_SIZE = 8;

/**
 * Build a roster {@link AvailabilitySummary} by joining each player's injury /
 * game-shape data (from roster.aspx) with their playing time, keeping the top
 * {@link ROTATION_SIZE} by minutes so deep-bench noise can't move the modifier.
 *
 * `minutesByPlayerId` is whatever playing-time weight is available for the team
 * (season totals for your own team, last-N box-score totals for an opponent);
 * only the relative ordering and weighting matter.
 */
export function deriveAvailability(
  players: Player[],
  minutesByPlayerId: Map<string, number>,
): AvailabilitySummary | null {
  if (players.length === 0) {
    return null;
  }

  const rotation: AvailabilityPlayer[] = players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      minutes: minutesByPlayerId.get(player.id) ?? null,
      injured: player.injured === true,
      gameShape: isFiniteNumber(player.gameShape) ? player.gameShape : null,
    }))
    .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
    .slice(0, ROTATION_SIZE);

  const strengthModifier = teamStrengthModifier(
    rotation.map<RosterPlayerAvailability>((player) => ({
      minutes: player.minutes,
      injured: player.injured,
      gameShape: player.gameShape,
    })),
  );

  return {
    players: rotation,
    strengthModifier,
    injuredPlayers: rotation.filter((p) => p.injured).map((p) => p.name),
    averageGameShape: healthyAverageGameShape(rotation),
  };
}

function healthyAverageGameShape(
  rotation: AvailabilityPlayer[],
): number | null {
  let weight = 0;
  let sum = 0;
  for (const player of rotation) {
    if (player.injured || !isFiniteNumber(player.gameShape)) continue;
    const w =
      isFiniteNumber(player.minutes) && player.minutes > 0 ? player.minutes : 1;
    weight += w;
    sum += w * player.gameShape;
  }
  return weight > 0 ? sum / weight : null;
}
