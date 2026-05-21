import { Suspense } from "react";
import { WellnessContextQuestionnaire } from "@/components/WellnessContextQuestionnaire";
import { wellnessContextAssessmentId } from "@/data/wellness-context-questionnaire";
import { loadPublicAssessmentForBootstrap } from "@/lib/server/public-assessment-bootstrap";

export default async function WellnessContextPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const bootstrapQuestionnaire = await loadPublicAssessmentForBootstrap(wellnessContextAssessmentId);

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}>
      <WellnessContextQuestionnaire
        attemptId={attemptId}
        bootstrapQuestionnaire={bootstrapQuestionnaire}
      />
    </Suspense>
  );
}
