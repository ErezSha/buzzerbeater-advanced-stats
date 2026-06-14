export interface Team {
  id: string;
  name: string;
  owner?: string | null;
  leagueId?: string | null;
  leagueName?: string | null;
  leagueLevel?: string | null;
  countryId?: string | null;
  countryName?: string | null;
}

export interface Player {
  id: string;
  name: string;
  position?: string | null;
  age?: number | null;
  height?: string | null;
  salary?: number | null;
  rosterStatus: "active" | "inactive" | "unknown";
  /** True when roster.aspx reports the player currently injured (`<injury>1</injury>`). */
  injured?: boolean | null;
  /** BuzzerBeater game shape (1–10) from roster.aspx `<skills>`, or null when absent. */
  gameShape?: number | null;
}

export interface PlayerSkills {
  jumpShot?: number | null;
  jumpRange?: number | null;
  outsideDefense?: number | null;
  handling?: number | null;
  driving?: number | null;
  passing?: number | null;
  insideScoring?: number | null;
  insideDefense?: number | null;
  shotBlocking?: number | null;
  rebounding?: number | null;
  speed?: number | null;
  stamina?: number | null;
  freeThrow?: number | null;
  experience?: number | null;
}

export interface PlayerDetail extends Player {
  ownerTeamId?: string | null;
  nationalityId?: string | null;
  nationalityName?: string | null;
  dmi?: number | null;
  jersey?: number | null;
  seasonDrafted?: number | null;
  leagueDrafted?: number | null;
  teamDrafted?: string | null;
  draftPick?: number | null;
  forSale: boolean;
  potential?: number | null;
  gameShape?: number | null;
  skills?: PlayerSkills | null;
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
  status: "scheduled" | "in_progress" | "finished" | "unknown";
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
  mostPlayedPosition?: string | null;
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
  plusMinus?: number | null;
}

export interface TeamGameStat {
  matchId: string;
  teamId?: string | null;
  teamName?: string | null;
  isHome?: boolean | null;
  points?: number | null;
  offStrategy: string | null;
  defStrategy: string | null;
  effort?: string | null;
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
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  shooting: ShootingMetrics;
  turnoverPercentage: number | null;
  assistPercentage: number | null;
  blockPercentage: number | null;
  stealPercentage: number | null;
  reboundPercentage: number | null;
  usageRate: number | null;
  // Dean Oliver individual ratings (box-score estimates), distinct from the
  // team-level ratings on TeamGameMetrics.
  offensiveRating: number | null;
  defensiveRating: number | null;
  gameScoreTotal: number | null;
  gameScoreAverage: number | null;
  plusMinus: number | null;
  doubleDoubles: number;
  tripleDoubles: number;
  quadrupleDoubles: number;
  fiveByFives: number;
  seasonStat?: PlayerSeasonStat | null;
}

export interface TeamGameMetrics {
  matchId: string;
  date: string;
  opponentName?: string | null;
  matchType?: string | null;
  offStrategy?: string | null;
  defStrategy?: string | null;
  effort?: string | null;
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
  pythagoreanWins: number | null;
  pythagoreanLosses: number | null;
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

export interface AvailabilityPlayer {
  playerId: string;
  name: string;
  /** Playing-time weight (minutes per game) used to weight the roster signals. */
  minutes: number | null;
  injured: boolean;
  gameShape: number | null;
}

export interface AvailabilitySummary {
  /** Rotation players (top by minutes) that drive the strength modifier. */
  players: AvailabilityPlayer[];
  /** Final strength multiplier handed to the matchup engine (clamped). */
  strengthModifier: number;
  /** Names of injured rotation players, for UI display. */
  injuredPlayers: string[];
  /** Minutes-weighted average game shape of the healthy rotation, or null. */
  averageGameShape: number | null;
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
  /** Own-team roster availability (injury + game shape), or null when unavailable. */
  availability: AvailabilitySummary | null;
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

export interface LeaguePlayerMetricSummary extends PlayerMetricSummary {
  teamId: string;
  teamName: string;
}

export interface SinglePlayerAnalysis {
  player: PlayerDetail;
  ownerTeam: Team;
  summary: PlayerMetricSummary;
  finishedMatchCount: number;
  boxScoreCount: number;
  refreshedAt: string;
  previousSnapshot: PlayerScoutingSnapshot | null;
}

export interface PlayerScoutingSnapshot {
  savedAt: string;
  player: PlayerDetail;
  ownerTeam: Team;
  summary: PlayerMetricSummary;
}
