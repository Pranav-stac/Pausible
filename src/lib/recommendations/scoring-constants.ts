/**
 * A12–A13 recommendation scoring framework (v1.0).
 * @see Pausibl Recommendation Engine — Developer Implementation Guide
 */

export const A12_SPEC_VERSION = "v1.0";

/** Max total score used for internal ranking only (not shown to users). */
export const A12_MAX_SCORE = 125;

export const A12_PERSONA = {
  primary: 25,
  secondary: 15,
  allPersonas: 10,
  cap: 40,
} as const;

export const A12_BARRIER = { perMatch: 12, cap: 36 } as const;
export const A12_GOAL = { perMatch: 8, cap: 24 } as const;
export const A12_CONTEXT = { perMatch: 3, cap: 15 } as const;

export const A12_STRENGTH_POINTS = {
  core: 10,
  supporting: 5,
  optional: 0,
  conditional: -5,
} as const;

/** Tie-breaker: higher rank wins. */
export const A12_STRENGTH_RANK = {
  core: 4,
  supporting: 3,
  optional: 2,
  conditional: 1,
} as const;

export const A12_OPPORTUNITY_POOL_SIZE = 20;
export const A12_OPPORTUNITY_CLUSTER_COUNT = 3;
export const A12_CLUSTER_TOP_ROWS_FOR_AVG = 5;

export const A12_LAUNCHPAD_COUNT = 6;
export const A12_COACH_NOTES_MAX = 4;
export const A12_SAFETY_MAX = 3;
