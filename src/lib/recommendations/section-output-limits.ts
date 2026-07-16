/**
 * Per-section LLM output caps.
 *
 * PDA §18.2 lists ≤500 tokens/section. PDA §20 word-count schemas (150–200w narrative,
 * multi-phase plan JSON) require more completion budget — those sections intentionally exceed
 * the §18.2 ceiling. Short sections stay at the §18.2 default.
 */
export const PDA_SECTION_TOKEN_DEFAULT = 500;

export const SECTION_OUTPUT_TOKENS = {
  primaryPattern: 1600,
  secondaryPattern: 1200,
  blindSpots: 800,
  pillar: 800,
  priorities: 1000,
  integratedPlan: 2200,
  coachGuidePage2: 1400,
  coachGuidePage3: 800,
  coachGuideMatrix: 2200,
  default: PDA_SECTION_TOKEN_DEFAULT,
} as const;

/** PDA §18.2 nucleus sampling. */
export const PDA_TOP_P = 0.9;
/** PDA §18.2 temperature. */
export const PDA_TEMPERATURE = 0.7;
