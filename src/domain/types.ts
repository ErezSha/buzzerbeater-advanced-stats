export interface Team {
  id: string;
  name: string;
  owner?: string | null;
  leagueId?: string | null;
  countryId?: string | null;
}

export interface Player {
  id: string;
  name: string;
  position?: string | null;
  age?: number | null;
  height?: string | null;
  salary?: number | null;
  rosterStatus: "active" | "inactive" | "unknown";
}

export interface Match {
  id: string;
  season?: string | null;
  date: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  opponentName?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: "scheduled" | "finished" | "unknown";
  type?: string | null;
}

export interface PlayerSeasonStat {
  playerId: string;
  games?: number | null;
  minutesPerGame?: number | null;
  pointsPerGame?: number | null;
  fieldGoalPercentage?: number | null;
  freeThrowPercentage?: number | null;
  threePointPercentage?: number | null;
  reboundsPerGame?: number | null;
  offensiveReboundsPerGame?: number | null;
  assistsPerGame?: number | null;
  stealsPerGame?: number | null;
  blocksPerGame?: number | null;
  turnoversPerGame?: number | null;
  foulsPerGame?: number | null;
  rating?: number | null;
}

export interface PlayerGameStat {
  matchId: string;
  playerId: string;
  playerName?: string | null;
  teamId?: string | null;
  minutes?: number | null;
  points?: number | null;
  fieldGoals?: number | null;
  fieldGoalAttempts?: number | null;
  twoPointMakes?: number | null;
  twoPointAttempts?: number | null;
  threePointMakes?: number | null;
  threePointAttempts?: number | null;
  freeThrows?: number | null;
  freeThrowAttempts?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  totalRebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  fouls?: number | null;
}

export interface TeamGameStat {
  matchId: string;
  teamId?: string | null;
  teamName?: string | null;
  isHome?: boolean | null;
  points?: number | null;
  fieldGoals?: number | null;
  fieldGoalAttempts?: number | null;
  threePointMakes?: number | null;
  threePointAttempts?: number | null;
  freeThrows?: number | null;
  freeThrowAttempts?: number | null;
  offensiveRebounds?: number | null;
  defensiveRebounds?: number | null;
  totalRebounds?: number | null;
  assists?: number | null;
  steals?: number | null;
  blocks?: number | null;
  turnovers?: number | null;
  fouls?: number | null;
}

export interface BoxScore {
  matchId: string;
  homeTeam?: TeamGameStat | null;
  awayTeam?: TeamGameStat | null;
  players: PlayerGameStat[];
}

export interface NormalizedBbapiData {
  team: Team;
  players: Player[];
  matches: Match[];
  playerSeasonStats: PlayerSeasonStat[];
  boxScores: BoxScore[];
  derived: DerivedDashboardMetrics;
  refreshedAt: string;
}

export interface ShootingMetrics {
  fieldGoalPercentage: number | null;
  twoPointPercentage: number | null;
  threePointPercentage: number | null;
  freeThrowPercentage: number | null;
  effectiveFieldGoalPercentage: number | null;
  trueShootingAttempts: number | null;
  trueShootingPercentage: number | null;
}

export interface PlayerMetricSummary {
  playerId: string;
  name: string;
  position?: string | null;
  rosterStatus: Player["rosterStatus"];
  games: number;
  minutes: number | null;
  points: number;
  rebounds: number;
  assists: number;
  shooting: ShootingMetrics;
  turnoverPercentage: number | null;
  gameScoreTotal: number | null;
  gameScoreAverage: number | null;
  seasonStat?: PlayerSeasonStat | null;
}

export interface TeamGameMetrics {
  matchId: string;
  date: string;
  opponentName?: string | null;
  points: number | null;
  opponentPoints: number | null;
  margin: number | null;
  possessions: number | null;
  pace: number | null;
  offensiveRating: number | null;
  defensiveRating: number | null;
  shooting: ShootingMetrics;
  turnoverPercentage: number | null;
  offensiveReboundPercentage: number | null;
  freeThrowRate: number | null;
}

export interface TeamSeasonMetrics {
  games: number;
  wins: number;
  losses: number;
  pointsPerGame: number | null;
  opponentPointsPerGame: number | null;
  averageMargin: number | null;
  averagePossessions: number | null;
  offensiveRating: number | null;
  defensiveRating: number | null;
  shooting: ShootingMetrics;
  turnoverPercentage: number | null;
  offensiveReboundPercentage: number | null;
  freeThrowRate: number | null;
}

export interface TrendPoint {
  matchId: string;
  date: string;
  points: number | null;
  opponentPoints: number | null;
  margin: number | null;
  possessions: number | null;
  offensiveRating: number | null;
  defensiveRating: number | null;
}

export interface DashboardAlert {
  code: string;
  severity: "info" | "warning";
  title: string;
  message: string;
}

export interface DerivedDashboardMetrics {
  players: PlayerMetricSummary[];
  games: TeamGameMetrics[];
  team: TeamSeasonMetrics;
  trends: {
    games: TrendPoint[];
    rollingAverages: {
      last3: TeamSeasonMetrics | null;
      last5: TeamSeasonMetrics | null;
      last10: TeamSeasonMetrics | null;
    };
  };
  alerts: DashboardAlert[];
}
