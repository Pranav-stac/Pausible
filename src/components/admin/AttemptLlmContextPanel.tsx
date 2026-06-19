"use client";

import { useEffect, useState } from "react";
import { downloadLlmContextAsPdf } from "@/lib/admin/download-llm-context-pdf";
import type { AttemptLlmContextPackage, AttemptLlmSectionContext } from "@/lib/recommendations/build-attempt-llm-context";
import { reportLlmProviderLabel } from "@/lib/recommendations/report-llm-types";

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function SectionCard({ section, defaultOpen = false }: { section: AttemptLlmSectionContext; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-xl border border-slate-200 bg-white"
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Slide {section.slide} · {section.reportSection}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{section.label}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              section.skipped ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {section.skipped ? "Skipped" : "Active"}
          </span>
        </div>
      </summary>
      <div className="space-y-4 border-t border-slate-100 px-4 py-4">
        {section.skipped && section.skipReason ? (
          <p className="text-xs text-amber-800">{section.skipReason}</p>
        ) : null}

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Structured input data</p>
          <JsonBlock value={section.inputData} />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Expected JSON output</p>
          <JsonBlock value={section.outputSchema} />
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Actual LLM output</p>
          {section.output != null ? (
            <JsonBlock value={section.output} />
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              No stored output for this section (report not generated yet or section was skipped).
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">User prompt sent to LLM</p>
          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-800">
            {section.userPrompt || "(empty)"}
          </pre>
        </div>
      </div>
    </details>
  );
}

type Props = {
  attemptId: string;
  api: (path: string, init?: RequestInit) => Promise<Response>;
};

export function AttemptLlmContextPanel({ attemptId, api }: Props) {
  const [data, setData] = useState<AttemptLlmContextPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    void (async () => {
      try {
        const res = await api(`/api/admin/attempt-llm-context/${encodeURIComponent(attemptId)}`);
        const json = (await res.json()) as AttemptLlmContextPackage & { error?: string };
        if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load LLM context");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId, api]);

  if (loading) {
    return <p className="mt-6 text-xs text-slate-500">Building LLM section context…</p>;
  }

  if (error) {
    return <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</p>;
  }

  if (!data) return null;

  const cachedProvider = data.reportOutput.llmProvider;
  const cachedModel = data.reportOutput.tokenUsage?.model;
  const providerMismatch =
    data.reportOutput.available &&
    cachedProvider != null &&
    cachedProvider !== data.provider;

  const handlePdf = async () => {
    setPdfBusy(true);
    setPdfErr(null);
    try {
      await downloadLlmContextAsPdf(data, attemptId);
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">LLM report context</h4>
          <p className="mt-1 text-xs text-slate-600">
            Prompt preview uses the <strong>current</strong> admin provider ({reportLlmProviderLabel(data.provider)}{" "}
            · {data.model}). Cached report output below may have been generated with a different provider.
          </p>
        </div>
        <button
          type="button"
          disabled={pdfBusy}
          onClick={() => void handlePdf()}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {pdfBusy ? "Preparing PDF…" : "Download PDF"}
        </button>
      </div>
      {pdfErr ? <p className="text-xs text-red-700">{pdfErr}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">Current admin provider:</span>{" "}
          {reportLlmProviderLabel(data.provider)} · {data.model}
        </p>
        {data.reportOutput.available ? (
          <p className="mt-1">
            <span className="font-semibold text-slate-900">Cached report provider:</span>{" "}
            {reportLlmProviderLabel(cachedProvider ?? data.provider)}
            {cachedModel ? ` · ${cachedModel}` : ""}
          </p>
        ) : null}
        {providerMismatch ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900">
            Cached report was generated with {reportLlmProviderLabel(cachedProvider!)}. Admin is now set to{" "}
            {reportLlmProviderLabel(data.provider)}. Open the user results page and refresh to regenerate with the
            current provider.
          </p>
        ) : null}
        <p className="mt-1">
          <span className="font-semibold text-slate-900">Fit tier:</span> {data.fitBlend.fitTier} ·{" "}
          <span className="font-semibold text-slate-900">Blend:</span> {data.fitBlend.blendStrength}
        </p>
        <p className="mt-2 border-t border-slate-200 pt-2">
          <span className="font-semibold text-slate-900">Report output:</span>{" "}
          {data.reportOutput.available
            ? data.reportOutput.synthesized
              ? "Generated"
              : "Fallback (LLM unavailable)"
            : "Not cached on this attempt"}
          {data.reportOutput.synthesizedAt ? (
            <>
              {" "}
              · <span className="font-semibold text-slate-900">At:</span>{" "}
              {new Date(data.reportOutput.synthesizedAt).toLocaleString()}
            </>
          ) : null}
        </p>
        {data.reportOutput.tokenUsage ? (
          <p className="mt-1">
            <span className="font-semibold text-slate-900">Tokens:</span>{" "}
            {data.reportOutput.tokenUsage.totalTokens.toLocaleString()} total (
            {data.reportOutput.tokenUsage.promptTokens.toLocaleString()} in ·{" "}
            {data.reportOutput.tokenUsage.completionTokens.toLocaleString()} out)
          </p>
        ) : null}
        {data.reportOutput.synthesisError ? (
          <p className="mt-1 text-amber-800">
            <span className="font-semibold">Synthesis error (from cached report):</span>{" "}
            {data.reportOutput.synthesisError.includes("Gemini HTTP") &&
            data.reportOutput.synthesisError.includes("personality:")
              ? "Legacy Gemini report (pre–v2.0 pipeline, gemini-2.0-flash retired June 2026). Regenerate the report with the current provider. Details: "
              : null}
            {data.reportOutput.synthesisError}
          </p>
        ) : null}
      </div>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Shared system prompt</summary>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t border-slate-100 px-4 py-3 font-mono text-[10px] leading-relaxed text-slate-800">
          {data.systemPrompt}
        </pre>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
          Shared synthesis context (wellness + persona + ranked recs)
        </summary>
        <JsonBlock value={data.sharedContext} />
      </details>

      <div className="space-y-3">
        {data.sections.map((section, i) => (
          <SectionCard key={section.id} section={section} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
