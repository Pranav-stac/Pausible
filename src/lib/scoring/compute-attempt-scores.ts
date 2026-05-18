import type { AttemptAnswers, AttemptScores } from "@/types/models";
import type { PersonaScoringConfig } from "@/lib/scoring/persona-types";
import { attemptScoresFromPersonaAnalysis, computePersonaAnalysis } from "@/lib/scoring/persona";

/** Primary scoring path: OCEAN facets → traits → persona match (top 2). */
export function computeAttemptScores(
  answers: AttemptAnswers,
  config?: Partial<PersonaScoringConfig>,
): AttemptScores {
  const persona = computePersonaAnalysis(answers, config);
  return attemptScoresFromPersonaAnalysis(persona);
}
