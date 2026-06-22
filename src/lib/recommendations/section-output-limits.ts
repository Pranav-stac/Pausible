/** Per-section LLM output caps — primary/secondary need room for narrative + JSON boxes. */
export const SECTION_OUTPUT_TOKENS = {
  primaryPattern: 1600,
  secondaryPattern: 1200,
  blindSpots: 800,
  pillar: 800,
  priorities: 1000,
  integratedPlan: 1200,
  coachGuidePage2: 1400,
  coachGuidePage3: 1000,
  default: 600,
} as const;
