import { Suspense } from "react";
import { AssessmentRunner } from "@/components/AssessmentRunner";
import {
  loadPublicAssessmentForBootstrap,
  loadPublicRequirePaymentBootstrap,
} from "@/lib/server/public-assessment-bootstrap";

export default async function AssessmentPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  const [bootstrapAssessment, bootstrapRequirePayment] = await Promise.all([
    loadPublicAssessmentForBootstrap(assessmentId),
    loadPublicRequirePaymentBootstrap(),
  ]);

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}>
      <AssessmentRunner
        assessmentId={assessmentId}
        bootstrapAssessment={bootstrapAssessment}
        bootstrapRequirePayment={bootstrapRequirePayment}
      />
    </Suspense>
  );
}
