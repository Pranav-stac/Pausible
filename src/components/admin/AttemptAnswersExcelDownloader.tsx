"use client";

import { useState } from "react";

type Props = {
  attemptId: string;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  className?: string;
};

export function AttemptAnswersExcelDownloader({ attemptId, api, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await api(
        `/api/admin/attempts/${encodeURIComponent(attemptId)}/export-answers`,
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pausible-answers-${attemptId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export answers");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? "Exporting…" : "Export answers (.xlsx)"}
      </button>
      {error ? <p className="mt-1 text-[11px] text-red-700">{error}</p> : null}
    </div>
  );
}
