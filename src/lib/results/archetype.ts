import type { AssessmentDefinition } from "@/types/models";

export function getArchetypeCopy(assessment: AssessmentDefinition, archetypeKey?: string) {
  const list = assessment.interpretation?.archetypes ?? [];
  const match = archetypeKey ? list.find((a) => a.key === archetypeKey) : undefined;
  return match ?? list[0];
}
