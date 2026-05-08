import { Suspense } from "react";
import { ResultsClient } from "@/components/ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}>
      <ResultsClient />
    </Suspense>
  );
}
