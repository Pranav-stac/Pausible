import type { CoachGuidePillarMatrix } from "@/lib/coach-guide/types";
import type { PillarName } from "@/lib/recommendations/types";

const PILLARS: PillarName[] = [
  "Physical Activity",
  "Nutrition",
  "Sleep & Recovery",
  "Mental Wellness",
];

const MATRIX_ROWS = ["structure", "environment", "progression", "recoveryProtocol"] as const;

type MatrixRowKey = (typeof MATRIX_ROWS)[number];

function normalizeCell(text: string | undefined, max = 280): string {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Merge AI matrix cells with persona template fallbacks per cell. */
export function mergeAiPillarMatrix(
  ai: CoachGuidePillarMatrix | null | undefined,
  template: CoachGuidePillarMatrix,
  minChars = 36,
): { matrix: CoachGuidePillarMatrix; aiCellCount: number } {
  const matrix: CoachGuidePillarMatrix = {
    structure: {},
    environment: {},
    progression: {},
    recoveryProtocol: {},
  };
  let aiCellCount = 0;

  for (const row of MATRIX_ROWS) {
    for (const pillar of PILLARS) {
      const candidate = normalizeCell(ai?.[row]?.[pillar]);
      if (candidate.length >= minChars) {
        matrix[row][pillar] = candidate;
        aiCellCount += 1;
      } else {
        matrix[row][pillar] = template[row][pillar] ?? "";
      }
    }
  }

  return { matrix, aiCellCount };
}

export function isCompletePillarMatrix(matrix: CoachGuidePillarMatrix): boolean {
  return MATRIX_ROWS.every((row) =>
    PILLARS.every((pillar) => normalizeCell(matrix[row][pillar]).length > 0),
  );
}
