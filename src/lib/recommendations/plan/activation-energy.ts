import type { EffortLevel, RecommendationRow } from "@/lib/recommendations/types";

/** Map Effort Level (col U) → activation energy 1–5 (PDA §21.4 / A4). Direct read — no heuristics. */
export function classifyActivationEnergy(
  row: Pick<RecommendationRow, "effortLevel">,
): number {
  const effort: EffortLevel = row.effortLevel ?? 3;
  if (effort >= 1 && effort <= 5) return effort;
  return 3;
}

/** Phase-1 AE cap for primary persona (PDA §14 effort-exceeds-capacity penalty). */
export function phase1ActivationEnergyCap(
  personaKey: string,
  phaseConfigs: Record<string, { phases: Array<{ activationEnergyCap: number }> }>,
): number {
  const phases = phaseConfigs[personaKey]?.phases;
  if (!phases?.length) return 3;
  return phases[0].activationEnergyCap ?? 3;
}
