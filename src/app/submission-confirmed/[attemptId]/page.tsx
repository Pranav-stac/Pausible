import { Suspense } from "react";
import { SubmissionConfirmationScreen } from "@/components/journey/SubmissionConfirmationScreen";

export default async function SubmissionConfirmedPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <SubmissionConfirmationScreen attemptId={attemptId} />
    </Suspense>
  );
}
