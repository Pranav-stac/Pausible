/** True on browser reload or when ?regenerate=1 is in the URL. */
export function shouldForceRegenerateReport(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get("regenerate") === "1" || params.get("regenerate") === "true") return true;

  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}
