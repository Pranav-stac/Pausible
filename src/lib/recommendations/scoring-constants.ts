/**
 * PDA v1.0 recommendation scoring (§14).
 */
export const PDA_SPEC_VERSION = "v1.0";

/** Max total score used for internal ranking only (not shown to users). */
export const PDA_MAX_SCORE = 158;

/** Primary persona bonus by fit tier (§9). */
export const PDA_PERSONA_PRIMARY_BY_FIT_TIER = {
  classic: 25,
  core: 20,
  leaning: 15,
  exploring: 10,
} as const;

/** Secondary persona bonus by blend strength (§9, §14). */
export const PDA_PERSONA_SECONDARY_BY_BLEND = {
  pure: 8,
  tendencies: 12,
  strong_influence: 18,
} as const;

export const PDA_PERSONA = {
  allPersonas: 10,
  cap: 40,
} as const;

export const PDA_OCEAN = { perMatch: 4, cap: 20 } as const;
export const PDA_BARRIER = { perMatch: 12, cap: 36 } as const;
export const PDA_GOAL = { perMatch: 8, cap: 24 } as const;
export const PDA_CONTEXT = { perMatch: 3, cap: 15 } as const;
export const PDA_EFFORT = { bonus: 5, cap: 5 } as const;

export const PDA_STRENGTH_POINTS = {
  core: 10,
  supporting: 5,
  optional: 0,
  conditional: -5,
} as const;

export const PDA_STRENGTH_RANK = {
  core: 4,
  supporting: 3,
  optional: 2,
  conditional: 1,
} as const;

export const PDA_OPPORTUNITY_POOL_SIZE = 20;
export const PDA_OPPORTUNITY_CLUSTER_COUNT = 3;
export const PDA_CLUSTER_TOP_ROWS_FOR_AVG = 5;

/** Plan generator input pool — recs must score above this (§21.3 Step 1). */
export const PDA_PLAN_SCORE_THRESHOLD = 1;

export const PDA_RANK_PILLARS = [
  "Nutrition",
  "Physical Activity",
  "Sleep & Recovery",
  "Mental Wellness",
] as const;

/** PDA §19 — Page 7 report display / synthesis call order. */
export const PDA_REPORT_PILLAR_ORDER = [
  "Sleep & Recovery",
  "Nutrition",
  "Physical Activity",
  "Mental Wellness",
] as const;

/** @deprecated Use PDA_* constants */
export const A12_SPEC_VERSION = PDA_SPEC_VERSION;
export const A12_MAX_SCORE = PDA_MAX_SCORE;
export const A12_PERSONA_PRIMARY_BY_FIT_TIER = PDA_PERSONA_PRIMARY_BY_FIT_TIER;
export const A12_PERSONA = { secondary: 15, allPersonas: PDA_PERSONA.allPersonas, cap: PDA_PERSONA.cap };
export const A12_OCEAN = PDA_OCEAN;
export const A12_BARRIER = PDA_BARRIER;
export const A12_GOAL = PDA_GOAL;
export const A12_CONTEXT = PDA_CONTEXT;
export const A12_STRENGTH_POINTS = PDA_STRENGTH_POINTS;
export const A12_STRENGTH_RANK = PDA_STRENGTH_RANK;
export const A12_OPPORTUNITY_POOL_SIZE = PDA_OPPORTUNITY_POOL_SIZE;
export const A12_OPPORTUNITY_CLUSTER_COUNT = PDA_OPPORTUNITY_CLUSTER_COUNT;
export const A12_CLUSTER_TOP_ROWS_FOR_AVG = PDA_CLUSTER_TOP_ROWS_FOR_AVG;
