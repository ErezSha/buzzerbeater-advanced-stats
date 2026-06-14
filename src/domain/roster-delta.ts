/**
 * Roster-change detection for the validation harness.
 *
 * A team's season-to-date efficiency (ORtg/DRtg/pace) is reconstructed from box
 * scores that include every player who appeared — including any since sold. If a
 * team sells its anchor (or buys a star) between the efficiency window and the
 * game we're predicting, that efficiency over- or under-states the team that will
 * actually take the floor. This module measures that structural change so the
 * prediction can discount for it and so the dataset can be experimented on.
 *
 * Two directions, asymmetric in what we can observe:
 *  - DEPARTED: logged minutes in the window but is absent from the pre-game
 *    roster. We have their minutes, Game Score, and last-known salary/DMI.
 *  - ARRIVED: on the pre-game roster but never appeared in the window (no history
 *    with this team). Minutes/GmSc can't see them — salary/DMI is the only signal.
 *
 * Because an arrival is only valued by salary/DMI, the strength proxy must be
 * salary or DMI to capture a buy; minutes can only ever express a sale. All three
 * are exposed so the harness can compare which best predicts actual results.
 *
 * Pure functions only (project rule: test logic, not pages).
 */
import { TOTAL_GAME_MINUTES } from "@/domain/matchup";

/** Minimum window minutes-per-game for a player to count as a real rotation piece. */
export const DEFAULT_ROTATION_MPG = 12;

/** Clamp band for the roster-change strength factor, so one move can't run away. */
export const ROSTER_DELTA_MIN = 0.6;
export const ROSTER_DELTA_MAX = 1.2;

/** Window fraction (minutes or salary swing) above which a game is low-confidence. */
export const DEFAULT_DISRUPTION_CUTOFF = 0.25;

export type StrengthProxy = "salary" | "dmi" | "minutes" | "none";

/** A player who appeared in the efficiency window, with their window footprint. */
export interface WindowPlayer {
  playerId: string;
  /** Minutes per game across the window. */
  mpg: number;
  /** Average Game Score across the window, or null when unavailable. */
  gmScore: number | null;
  /** Last-known salary at or before the game, or null. */
  salary: number | null;
  /** Last-known DMI at or before the game, or null. */
  dmi: number | null;
}

/** A player on the pre-game roster (current snapshot). */
export interface CurrentPlayer {
  playerId: string;
  salary: number | null;
  dmi: number | null;
}

/** A single side of the change: a player who left or joined. */
export interface DeltaPlayer {
  playerId: string;
  mpg: number | null;
  gmScore: number | null;
  salary: number | null;
  dmi: number | null;
}

export interface RosterDelta {
  departed: DeltaPlayer[];
  arrived: DeltaPlayer[];
  /** Rotation-core totals over the window — the normalizing base for the factor. */
  windowSalary: number | null;
  windowDmi: number | null;
  windowMinutes: number;
  departedSalary: number | null;
  departedDmi: number | null;
  departedMinutes: number;
  arrivedSalary: number | null;
  arrivedDmi: number | null;
}

function sumOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}

/**
 * Compute the roster change between the efficiency window's rotation and the
 * pre-game roster. `rotationMpg` filters the window to genuine rotation players
 * so selling a deep-bench player is noise, not signal. Arrivals are matched
 * against *every* window appearance (any minutes), so a returning player isn't
 * mistaken for a new signing.
 */
export function computeRosterDelta(
  windowPlayers: WindowPlayer[],
  currentPlayers: CurrentPlayer[],
  rotationMpg: number = DEFAULT_ROTATION_MPG,
): RosterDelta {
  const currentIds = new Set(currentPlayers.map((p) => p.playerId));
  const windowIds = new Set(windowPlayers.map((p) => p.playerId));

  const rotation = windowPlayers.filter((p) => p.mpg >= rotationMpg);
  const departedPlayers = rotation.filter((p) => !currentIds.has(p.playerId));
  const arrivedPlayers = currentPlayers.filter((p) => !windowIds.has(p.playerId));

  const departed: DeltaPlayer[] = departedPlayers.map((p) => ({
    playerId: p.playerId,
    mpg: p.mpg,
    gmScore: p.gmScore,
    salary: p.salary,
    dmi: p.dmi,
  }));
  const arrived: DeltaPlayer[] = arrivedPlayers.map((p) => ({
    playerId: p.playerId,
    mpg: null,
    gmScore: null,
    salary: p.salary,
    dmi: p.dmi,
  }));

  return {
    departed,
    arrived,
    windowSalary: sumOrNull(rotation.map((p) => p.salary)),
    windowDmi: sumOrNull(rotation.map((p) => p.dmi)),
    windowMinutes: rotation.reduce((sum, p) => sum + p.mpg, 0),
    departedSalary: sumOrNull(departedPlayers.map((p) => p.salary)),
    departedDmi: sumOrNull(departedPlayers.map((p) => p.dmi)),
    departedMinutes: departedPlayers.reduce((sum, p) => sum + p.mpg, 0),
    arrivedSalary: sumOrNull(arrivedPlayers.map((p) => p.salary)),
    arrivedDmi: sumOrNull(arrivedPlayers.map((p) => p.dmi)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Minutes-only discount: the departed rotation's share of a full game's floor
 * time, debited from full strength. Normalized by {@link TOTAL_GAME_MINUTES}
 * (240) — the same per-game basis matchup.ts uses for injured minutes — so this
 * sits on the same scale as the availability modifier and is robust to how many
 * bodies a team churned through the window. A signing has no minutes, so this can
 * only ever express a sale; that one-sidedness is deliberate.
 */
function minutesFactor(delta: RosterDelta): number {
  return clamp(
    1 - delta.departedMinutes / TOTAL_GAME_MINUTES,
    ROSTER_DELTA_MIN,
    ROSTER_DELTA_MAX,
  );
}

/** Every departed player has a known value under the proxy (so the sale is priceable). */
function departuresPriceable(delta: RosterDelta, proxy: "salary" | "dmi"): boolean {
  return delta.departed.every(
    (p) => (proxy === "salary" ? p.salary : p.dmi) !== null,
  );
}

/**
 * Strength multiplier capturing the roster change under the chosen proxy:
 *   factor = clamp(1 + (arrivedValue − departedValue) / windowValue)
 *
 * `minutes` has no arrival term (a new signing has no minutes), so it can only
 * ever discount a sale — that asymmetry is the point of comparing it against
 * salary/DMI.
 *
 * Cold-start safety: salary/DMI can always price an arrival (it's on the current
 * roster) but can only price a departure if we captured that player in an earlier
 * snapshot. A player sold before our first snapshot has an unknown value, which
 * would let unpriced arrivals alone inflate the factor — boosting a team that got
 * weaker. So whenever a departed player can't be priced, we fall back to the
 * always-observable {@link minutesFactor}, which still discounts the sale. Returns
 * 1.0 when nothing changed, `proxy === "none"`, or there is no usable signal.
 */
export function rosterDeltaFactor(
  delta: RosterDelta,
  proxy: StrengthProxy,
): number {
  if (proxy === "none") return 1;
  if (proxy === "minutes") return minutesFactor(delta);

  const base = proxy === "salary" ? delta.windowSalary : delta.windowDmi;
  // No value base, or a departure we can't price → use the minutes signal instead.
  if (base === null || base <= 0 || !departuresPriceable(delta, proxy)) {
    return delta.departed.length > 0 ? minutesFactor(delta) : 1;
  }

  const departed = proxy === "salary" ? delta.departedSalary : delta.departedDmi;
  const arrived = proxy === "salary" ? delta.arrivedSalary : delta.arrivedDmi;
  const swing = (arrived ?? 0) - (departed ?? 0);
  return clamp(1 + swing / base, ROSTER_DELTA_MIN, ROSTER_DELTA_MAX);
}

/**
 * Structural disruption magnitude in [0, ∞), proxy-independent: the larger of the
 * departed minutes share and the net salary swing share. Used to flag a game as
 * low-confidence (efficiency too contaminated to trust) regardless of which
 * proxy ultimately adjusts the prediction.
 */
export function rosterDisruption(delta: RosterDelta): number {
  const minutesShare = delta.departedMinutes / TOTAL_GAME_MINUTES;
  const salarySwing =
    delta.windowSalary && delta.windowSalary > 0
      ? Math.abs((delta.arrivedSalary ?? 0) - (delta.departedSalary ?? 0)) /
        delta.windowSalary
      : 0;
  return Math.max(minutesShare, salarySwing);
}
