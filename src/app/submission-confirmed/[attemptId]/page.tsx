import { Suspense } from "react";
import { SubmissionConfirmationScreen } from "@/components/journey/SubmissionConfirmationScreen";
import { APP_BODY, APP_PAGE_BG_SOFT } from "@/components/marketing/marketing-brand";

export default async function SubmissionConfirmedPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return (
    <Suspense
      fallback={
        <div className={`flex min-h-screen items-center justify-center ${APP_PAGE_BG_SOFT} ${APP_BODY}`}>
          Loading…
        </div>
      }
    >
      <SubmissionConfirmationScreen attemptId={attemptId} />
    </Suspense>
  );
}
