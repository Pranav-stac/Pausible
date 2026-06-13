import { ReportBuildingScreen } from "@/components/journey/ReportBuildingScreen";

export default async function ReportBuildingPage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { attemptId } = await params;
  const { next } = await searchParams;
  return <ReportBuildingScreen attemptId={attemptId} nextPath={next} />;
}
