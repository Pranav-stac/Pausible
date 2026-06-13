"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import { reportAttemptRef } from "@/lib/results/build-results-report";
import { downloadReportAsPdf } from "@/lib/results/download-report-pdf";
import { PERSONA_REPORT_THEME } from "@/lib/results/persona-report-theme";
import type { PersonaKey } from "@/lib/scoring/persona-types";

/** ~A4 at 96dpi — keeps PDF export consistent */
const PAGE_CLASS =
  "report-page mx-auto box-border w-full max-w-[49.625rem] bg-white px-10 py-12 shadow-[0_1px_0_rgba(15,23,42,0.06)] sm:px-14 sm:py-14 print:shadow-none";
const PAGE_DIM = "min-h-[70.1875rem] flex flex-col";

function ReportFooter({ page, total, refId }: { page: number; total: number; refId: string }) {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-slate-200 pt-6 text-[10px] text-slate-400">
      <span>Pausible · Wellness Persona Report</span>
      <span className="tabular-nums">
        {refId} · {page}/{total}
      </span>
    </footer>
  );
}

function PersonaBadge({ personaKey, size = "md" }: { personaKey: PersonaKey; size?: "sm" | "md" | "lg" }) {
  const t = PERSONA_REPORT_THEME[personaKey];
  const dim = size === "lg" ? "h-20 w-20 text-2xl" : size === "sm" ? "h-10 w-10 text-sm" : "h-14 w-14 text-lg";
  return (
    <div
      className={`grid shrink-0 place-items-center font-bold text-white ${dim}`}
      style={{ backgroundColor: t.hex }}
    >
      {t.abbr}
    </div>
  );
}

function MixCircles({ mix }: { mix: ResultsReportModel["personaMix"] }) {
  const top = mix.slice(0, 4);
  const max = Math.max(...top.map((r) => r.pct), 1);

  return (
    <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-10">
      {top.map((row) => {
        const theme = PERSONA_REPORT_THEME[row.key];
        const scale = 0.55 + (row.pct / max) * 0.45;
        const size = Math.round(72 + scale * 56);
        return (
          <div key={row.key} className="flex flex-col items-center gap-2">
            <div
              className="rounded-full transition-all"
              style={{
                width: size,
                height: size,
                backgroundColor: theme.hex,
                opacity: 0.92,
              }}
              title={`${row.label} ${row.pct.toFixed(1)}%`}
            />
            <div className="text-center">
              <p className="text-[11px] font-bold tabular-nums text-slate-900">{row.pct.toFixed(0)}%</p>
              <p className="max-w-[5.5rem] text-[10px] leading-tight text-slate-500">{row.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TraitBars({ dimensions }: { dimensions: ResultsReportModel["dimensions"] }) {
  return (
    <div className="space-y-5">
      {dimensions.map((d, idx) => {
        const hues = ["#1e3a5f", "#2563eb", "#0ea5e9", "#64748b", "#334155"] as const;
        const c = hues[idx % hues.length];
        return (
          <div key={d.key}>
            <div className="flex justify-between text-xs font-semibold tracking-wide text-slate-600">
              <span>{d.label}</span>
              <span className="tabular-nums text-slate-900">{d.pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-sm bg-slate-100">
              <div className="h-full rounded-sm" style={{ width: `${d.pct}%`, backgroundColor: c }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PausibleResultsReport({
  model,
  attemptId,
  onBack,
}: {
  model: ResultsReportModel;
  attemptId: string;
  onBack?: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState<string | null>(null);
  const refId = reportAttemptRef(attemptId);
  const totalPages = model.wellnessHighlights.length > 0 ? 4 : 3;
  const primaryTheme = model.primaryKey ? PERSONA_REPORT_THEME[model.primaryKey] : null;

  const handlePdf = async () => {
    const root = rootRef.current;
    if (!root) return;
    setPdfBusy(true);
    setPdfErr(null);
    try {
      await downloadReportAsPdf(root, `pausible-report-${refId}`);
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="scheme-light">
      <div className="sticky top-[3.25rem] z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[52rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Full report</p>
            <p className="text-sm font-semibold text-slate-900">Wellness persona results</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                ← Summary view
              </button>
            ) : null}
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => void handlePdf()}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
            >
              {pdfBusy ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
        {pdfErr ? <p className="mx-auto max-w-[52rem] px-4 pb-2 text-center text-xs text-red-700">{pdfErr}</p> : null}
      </div>

      <div ref={rootRef} className="mx-auto flex max-w-[52rem] flex-col gap-0 bg-slate-100 py-8 sm:py-10">
        {/* Page 1 — Cover */}
        <section data-report-page className={`${PAGE_CLASS} ${PAGE_DIM}`}>
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm font-bold tracking-tight text-slate-900">Pausible</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Confidential</span>
          </div>

          <div className="my-16 flex flex-col items-center text-center sm:my-20">
            <div
              className="relative flex h-44 w-44 items-center justify-center rounded-full sm:h-52 sm:w-52"
              style={{
                background: primaryTheme
                  ? `conic-gradient(from 200deg, ${primaryTheme.hex} 0deg, #e2e8f0 120deg, ${primaryTheme.hex}88 240deg, #f1f5f9 360deg)`
                  : "linear-gradient(135deg, #e2e8f0, #f8fafc)",
              }}
            >
              <div className="absolute inset-4 rounded-full bg-white shadow-inner" />
              {model.animalImagePath ? (
                <div className="relative z-10 h-24 w-24 overflow-hidden rounded-2xl sm:h-28 sm:w-28">
                  <Image
                    src={model.animalImagePath}
                    alt=""
                    width={112}
                    height={112}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <span className="relative z-10 text-4xl">{model.animalEmoji ?? "✦"}</span>
              )}
            </div>
            <h1 className="mt-10 max-w-md text-2xl font-bold leading-tight tracking-tight text-slate-950 sm:text-3xl">
              Your Wellness Intelligence Report
            </h1>
            {model.personaTitle ? (
              <p className="mt-4 text-lg font-semibold" style={{ color: primaryTheme?.hex }}>
                {model.personaTitle}
              </p>
            ) : null}
            {model.fitScore != null ? (
              <p className="mt-2 text-sm text-slate-600">{Math.round(model.fitScore)}% persona fit</p>
            ) : null}
            <p className="mt-4 text-base text-slate-600">for {model.participantName}</p>
            <div className="mt-8 h-px w-24 bg-slate-300" />
            <p className="mt-6 text-sm text-slate-500">{model.generatedAt}</p>
          </div>

          <ReportFooter page={1} total={totalPages} refId={refId} />
        </section>

        {/* Page 2 — Your pattern */}
        <section data-report-page className={`${PAGE_CLASS} ${PAGE_DIM}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Your pattern</p>
          <h2 className="mt-4 max-w-2xl text-2xl font-bold leading-snug tracking-tight text-slate-950 sm:text-[1.65rem]">
            {model.personaTitle ?? (model.primaryKey ? (
              <>
                You are most closely aligned with the{" "}
                <span style={{ color: primaryTheme?.hex }}>{model.primaryLabel}</span> pattern
                {model.animalName ? (
                  <>
                    {" "}
                    — <span className="text-slate-800">{model.animalName}</span> {model.animalEmoji}
                  </>
                ) : null}
                .
              </>
            ) : (
              "Your wellness persona profile"
            ))}
          </h2>

          {model.secondaryLabel ? (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Secondary influence: <strong className="text-slate-800">{model.secondaryLabel}</strong>
              {model.secondaryPct != null ? ` (${model.secondaryPct.toFixed(1)}% match)` : null}.
            </p>
          ) : null}

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-slate-700">{model.primarySummary}</p>

          <div className="mt-12">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Persona mix
            </p>
            <div className="mt-8">
              <MixCircles mix={model.personaMix} />
            </div>
          </div>

          {model.primaryKey ? (
            <div className="mt-14 grid gap-8 border-t border-slate-100 pt-10 sm:grid-cols-[auto_1fr]">
              <PersonaBadge personaKey={model.primaryKey} size="lg" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Primary pattern</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{model.primarySummary}</p>
              </div>
            </div>
          ) : null}

          <ReportFooter page={2} total={totalPages} refId={refId} />
        </section>

        {/* Page 3 — Traits & playbook */}
        <section data-report-page className={`${PAGE_CLASS} ${PAGE_DIM}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Profile & playbook</p>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">How you show up across traits</h2>
          <p className="mt-2 text-sm text-slate-600">
            Relative standing on the five dimensions that shaped your persona match.
          </p>

          <div className="mt-10">
            <TraitBars dimensions={model.dimensions} />
          </div>

          <div className="mt-14 border-t border-slate-200 pt-10">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Your playbook</h3>
            <p className="mt-2 text-sm text-slate-600">Practical moves that fit your primary pattern.</p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Do</p>
                <ul className="mt-4 space-y-3">
                  {model.primaryBullets.map((b) => (
                    <li key={b} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Keep in mind</p>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    Revisit this report when your routine or stress level shifts materially.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    Pair structure with recovery—consistency beats intensity spikes.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <ReportFooter page={3} total={totalPages} refId={refId} />
        </section>

        {/* Page 4 — Wellness context (optional) */}
        {model.wellnessHighlights.length > 0 ? (
          <section data-report-page className={`${PAGE_CLASS} ${PAGE_DIM}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Wellness context</p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">Your lifestyle snapshot</h2>
            <p className="mt-2 text-sm text-slate-600">
              Highlights from your context questionnaire—goals, barriers, and environment.
            </p>

            <div className="mt-10 space-y-0 divide-y divide-slate-100">
              {model.wellnessHighlights.map((row) => (
                <div key={`${row.section}-${row.prompt}`} className="grid gap-2 py-5 sm:grid-cols-[1fr_1.1fr] sm:gap-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{row.section}</p>
                    <p className="mt-1 text-sm font-medium text-slate-800">{row.prompt}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 sm:text-right">{row.answer}</p>
                </div>
              ))}
            </div>

            <ReportFooter page={4} total={totalPages} refId={refId} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
