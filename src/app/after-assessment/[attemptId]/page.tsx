import { Suspense } from "react";
import { AfterAssessmentGate } from "@/components/AfterAssessmentGate";

export default async function AfterAssessmentPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
          Loading…
        </div>
      }
    >
      <AfterAssessmentGate attemptId={attemptId} />
    </Suspense>
  );
}
