import { testRouteAllowed } from "@/lib/testing/test-route";

export const TEST_AUTO_PDF_PARAM = "testAutoPdf";

export function testResultsQueryString(): string {
  return testRouteAllowed() ? `${TEST_AUTO_PDF_PARAM}=1` : "";
}

export function buildTestResultsHref(attemptId: string): string {
  const base = `/results/${encodeURIComponent(attemptId)}`;
  const qs = testResultsQueryString();
  return qs ? `${base}?${qs}` : base;
}

export function buildTestAfterAssessmentHref(
  attemptId: string,
  next: "results" | "checkout" = "results",
): string {
  const params = new URLSearchParams({ next });
  if (testRouteAllowed()) params.set(TEST_AUTO_PDF_PARAM, "1");
  return `/after-assessment/${encodeURIComponent(attemptId)}?${params.toString()}`;
}

export function isTestAutoPdfRequested(searchParams: URLSearchParams | ReadonlyURLSearchParams | null): boolean {
  if (!testRouteAllowed() || !searchParams) return false;
  return searchParams.get(TEST_AUTO_PDF_PARAM) === "1";
}

export function appendTestAutoPdfToHref(href: string): string {
  if (!testRouteAllowed()) return href;
  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const params = new URLSearchParams(qIndex === -1 ? "" : href.slice(qIndex + 1));
  params.set(TEST_AUTO_PDF_PARAM, "1");
  return `${path}?${params.toString()}`;
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, "get">;
