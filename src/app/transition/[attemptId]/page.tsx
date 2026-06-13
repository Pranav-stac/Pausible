import { TransitionScreen } from "@/components/journey/TransitionScreen";

export default async function TransitionPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <TransitionScreen attemptId={attemptId} />;
}
