import { wellnessContextAssessmentId } from "@/data/wellness-context-questionnaire";

export function buildChangeAnswerHref({
  attemptId,
  assessmentId,
  questionId,
  returnPath,
}: {
  attemptId: string;
  assessmentId: string;
  questionId: string;
  returnPath: string;
}): string {
  const q = encodeURIComponent(questionId);
  const ret = encodeURIComponent(returnPath);
  if (assessmentId === wellnessContextAssessmentId) {
    return `/wellness-context/${encodeURIComponent(attemptId)}?q=${q}&return=${ret}`;
  }
  return `/assessment/${encodeURIComponent(assessmentId)}?resume=${encodeURIComponent(attemptId)}&q=${q}&return=${ret}`;
}
