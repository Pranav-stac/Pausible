import { redirect } from "next/navigation";

/** Legacy interstitial — personality finish now goes straight to wellness context. */
export default async function TransitionPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  redirect(`/wellness-context/${encodeURIComponent(attemptId)}`);
}
