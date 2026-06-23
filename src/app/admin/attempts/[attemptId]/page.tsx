import { AdminAttemptDetailPage } from "@/components/admin/AdminAttemptDetailPage";

type Props = {
  params: Promise<{ attemptId: string }>;
};

export default async function AdminAttemptDetailRoute({ params }: Props) {
  const { attemptId } = await params;
  return <AdminAttemptDetailPage attemptId={attemptId} />;
}
