import type {
  PlayerGameStat,
  ShootingMetrics,
  TeamGameStat,
} from "@/domain/types";
import {
  effectiveFieldGoalPercentage,
  fieldGoalPercentage,
  safeRatio,
  trueShootingAttempts,
  trueShootingPercentage,
} from "@/domain/metrics";

export interface StatTotals {
  minutes: number | null;
  points: number;
  fieldGoals: number | null;
  fieldGoalAttempts: number | null;
  twoPointMakes: number | null;
  twoPointAttempts: number | null;
  threePointMakes: number | null;
  threePointAttempts: number | null;
  freeThrows: number | null;
  freeThrowAttempts: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  totalRebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fouls: number | null;
}

export function emptyTotals(): StatTotals {
  return {
    minutes: 0,
    points: 0,
    fieldGoals: 0,
    fieldGoalAttempts: 0,
    twoPointMakes: 0,
    twoPointAttempts: 0,
    threePointMakes: 0,
    threePointAttempts: 0,
    freeThrows: 0,
    freeThrowAttempts: 0,
    offensiveRebounds: 0,
    defensiveRebounds: 0,
    totalRebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    fouls: 0,
  };
}

export function addPlayerStat(total: StatTotals, stat: PlayerGameStat): StatTotals {
  return {
    minutes: addNullable(total.minutes, stat.minutes),
    points: total.points + (stat.points ?? 0),
    fieldGoals: addNullable(total.fieldGoals, stat.fieldGoals),
    fieldGoalAttempts: addNullable(total.fieldGoalAttempts, stat.fieldGoalAttempts),
    twoPointMakes: addNullable(total.twoPointMakes, stat.twoPointMakes),
    twoPointAttempts: addNullable(total.twoPointAttempts, stat.twoPointAttempts),
    threePointMakes: addNullable(total.threePointMakes, stat.threePointMakes),
    threePointAttempts: addNullable(total.threePointAttempts, stat.threePointAttempts),
    freeThrows: addNullable(total.freeThrows, stat.freeThrows),
    freeThrowAttempts: addNullable(total.freeThrowAttempts, stat.freeThrowAttempts),
    offensiveRebounds: addNullable(total.offensiveRebounds, stat.offensiveRebounds),
    defensiveRebounds: addNullable(total.defensiveRebounds, stat.defensiveRebounds),
    totalRebounds: addNullable(total.totalRebounds, stat.totalRebounds),
    assists: addNullable(total.assists, stat.assists),
    steals: addNullable(total.steals, stat.steals),
    blocks: addNullable(total.blocks, stat.blocks),
    turnovers: addNullable(total.turnovers, stat.turnovers),
    fouls: addNullable(total.fouls, stat.fouls),
  };
}

export function totalsFromTeamStat(team: TeamGameStat | null | undefined): StatTotals {
  return {
    minutes: null,
    points: team?.points ?? 0,
    fieldGoals: team?.fieldGoals ?? null,
    fieldGoalAttempts: team?.fieldGoalAttempts ?? null,
    twoPointMakes:
      team?.fieldGoals !== null &&
      team?.fieldGoals !== undefined &&
      team?.threePointMakes !== null &&
      team?.threePointMakes !== undefined
        ? team.fieldGoals - team.threePointMakes
        : null,
    twoPointAttempts:
      team?.fieldGoalAttempts !== null &&
      team?.fieldGoalAttempts !== undefined &&
      team?.threePointAttempts !== null &&
      team?.threePointAttempts !== undefined
        ? team.fieldGoalAttempts - team.threePointAttempts
        : null,
    threePointMakes: team?.threePointMakes ?? null,
    threePointAttempts: team?.threePointAttempts ?? null,
    freeThrows: team?.freeThrows ?? null,
    freeThrowAttempts: team?.freeThrowAttempts ?? null,
    offensiveRebounds: team?.offensiveRebounds ?? null,
    defensiveRebounds: team?.defensiveRebounds ?? null,
    totalRebounds: team?.totalRebounds ?? null,
    assists: team?.assists ?? null,
    steals: team?.steals ?? null,
    blocks: team?.blocks ?? null,
    turnovers: team?.turnovers ?? null,
    fouls: team?.fouls ?? null,
  };
}

export function shootingMetrics(totals: StatTotals): ShootingMetrics {
  return {
    fieldGoalPercentage: fieldGoalPercentage(
      totals.fieldGoals,
      totals.fieldGoalAttempts,
    ),
    twoPointPercentage: fieldGoalPercentage(
      totals.twoPointMakes,
      totals.twoPointAttempts,
    ),
    threePointPercentage: fieldGoalPercentage(
      totals.threePointMakes,
      totals.threePointAttempts,
    ),
    freeThrowPercentage: fieldGoalPercentage(
      totals.freeThrows,
      totals.freeThrowAttempts,
    ),
    effectiveFieldGoalPercentage: effectiveFieldGoalPercentage(
      totals.fieldGoals,
      totals.threePointMakes,
      totals.fieldGoalAttempts,
    ),
    trueShootingAttempts: trueShootingAttempts(
      totals.fieldGoalAttempts,
      totals.freeThrowAttempts,
    ),
    trueShootingPercentage: trueShootingPercentage(
      totals.points,
      totals.fieldGoalAttempts,
      totals.freeThrowAttempts,
    ),
  };
}

export function freeThrowRate(totals: StatTotals): number | null {
  return safeRatio(totals.freeThrowAttempts, totals.fieldGoalAttempts);
}

export function addNullable(
  left: number | null | undefined,
  right: number | null | undefined,
): number | null {
  if (left === null || left === undefined || right === null || right === undefined) {
    return null;
  }

  return left + right;
}

export function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );

  return present.length > 0
    ? present.reduce((sum, value) => sum + value, 0) / present.length
    : null;
}
