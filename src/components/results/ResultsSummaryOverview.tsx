"use client";

import Image from "next/image";
import Link from "next/link";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import type { FitTier } from "@/lib/scoring/persona-types";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import type { DimensionRow } from "@/lib/results/dimension-rows";
import { personaAnimal } from "@/lib/results/persona-display";
import { ResultsStoryPosterSection } from "@/components/results/ResultsStoryPosterSection";
import type { ResultsStoryPosterData } from "@/components/results/ResultsStoryPosterChrome";
import type { User } from "firebase/auth";
import type { SerializedAttempt } from "@/lib/local/attempts";

type Props = {
  model: ResultsReportModel;
  attemptId: string;
  dimensionRows: DimensionRow[];
  storyPoster: ResultsStoryPosterData;
  shareUrl?: string | null;
  onOpenReport: () => void;
  onCopyShare?: () => void;
  hasGoogleIdentity?: boolean;
  user?: User | null;
  history?: SerializedAttempt[];
};

export function ResultsSummaryOverview({
  model,
  attemptId,
  dimensionRows,
  storyPoster,
  shareUrl,
  onOpenReport,
  onCopyShare,
  hasGoogleIdentity,
  user,
  history = [],
}: Props) {
  const primaryAnimal = personaAnimal(model.primaryKey ?? undefined);
  const secondaryAnimal = model.secondaryKey ? personaAnimal(model.secondaryKey) : null;
  const summary = model.primaryKey ? PERSONA_DISPLAY[model.primaryKey].summary : model.primarySummary;
  const bullets = model.primaryKey ? PERSONA_DISPLAY[model.primaryKey].bullets : model.primaryBullets;
  const topTraits = dimensionRows.slice(0, 5);

  return (
    <div className="scheme-light min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-100 pb-16 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.15)]">
          <div className="grid gap-0 md:grid-cols-[1fr_auto]">
            <div className="p-6 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Your wellness snapshot</p>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                {model.personaTitle ?? model.primaryLabel}
              </h1>
              {model.fitScore != null ? (
                <p className="mt-3 inline-flex items-baseline gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                  <span className="text-xl font-black tabular-nums text-slate-900">{Math.round(model.fitScore)}%</span>
                  <span className="text-slate-600">
                    persona fit
                    {model.fitTier ? ` · ${fitTierLabel(model.fitTier as FitTier)}` : ""}
                  </span>
                </p>
              ) : null}
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{summary}</p>

              {model.secondaryLabel ? (
                <p className="mt-3 text-xs font-medium text-slate-500">
                  Secondary influence: {model.secondaryLabel}
                  {model.secondaryPct != null ? ` (${model.secondaryPct.toFixed(0)}%)` : ""}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                >
                  Open full report →
                </button>
                {shareUrl && onCopyShare ? (
                  <button
                    type="button"
                    onClick={onCopyShare}
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Copy share link
                  </button>
                ) : null}
              </div>
            </div>

            {/* Portraits */}
            <div className="flex items-center justify-center gap-4 border-t border-slate-100 bg-slate-50/80 p-6 md:flex-col md:border-t-0 md:border-l md:p-8">
              <div className="relative">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-lg sm:h-32 sm:w-32">
                  {primaryAnimal?.imagePath ? (
                    <Image
                      src={primaryAnimal.imagePath}
                      alt=""
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                      priority
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-slate-100 text-4xl">
                      {primaryAnimal?.emoji ?? "✦"}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 shadow ring-1 ring-slate-200">
                  Primary
                </span>
              </div>
              {secondaryAnimal ? (
                <div className="relative">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-md">
                    {secondaryAnimal.imagePath ? (
                      <Image src={secondaryAnimal.imagePath} alt="" width={64} height={64} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-slate-100 text-2xl">{secondaryAnimal.emoji}</div>
                    )}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500 shadow ring-1 ring-slate-200">
                    Secondary
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Trait footprint */}
        {topTraits.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Behavioral footprint</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {topTraits.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-600">{d.label}</span>
                    <span className="font-bold tabular-nums text-slate-900">{d.pct}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-700" style={{ width: `${d.pct}%`, opacity: 0.35 + d.pct / 200 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Quick highlights */}
        {bullets.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Start here</p>
            <ul className="mt-3 space-y-3">
              {bullets.slice(0, 3).map((b) => (
                <li key={b} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">
              Your full 11-slide report includes personality narrative, blind spots, action plan, launchpad, and coaching
              guide.
            </p>
          </div>
        ) : null}

        {/* Report preview cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { t: "Personality", d: "How you naturally approach wellness" },
            { t: "Action plan", d: "4 pillars with do's and don'ts" },
            { t: "Launchpad", d: "6 things to start this week" },
          ].map((card) => (
            <div key={card.t} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold text-slate-900">{card.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{card.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onOpenReport}
            className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-md hover:bg-slate-800 sm:w-auto sm:px-10"
          >
            Open full wellness report
          </button>
          <p className="mt-2 text-xs text-slate-500">11 sections · PDF download inside</p>
        </div>

        {/* Share */}
        <div className="mt-10">
          <ResultsStoryPosterSection
            variant="light"
            poster={storyPoster}
            filenameSlug={`results-${attemptId}`}
            shareSnippetUrl={shareUrl}
            participant={
              hasGoogleIdentity && user
                ? {
                    displayName: user.displayName?.trim() || user.email?.split("@")[0] || "Member",
                    googlePhotoUrl: user.photoURL ?? null,
                  }
                : null
            }
          />
        </div>

        {history.length > 1 ? (
          <div className="mt-8">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Past assessments</p>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {history.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/results/${row.id}`}
                    className={`flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 ${
                      row.id === attemptId ? "bg-slate-100 font-semibold" : "text-slate-700"
                    }`}
                  >
                    <span>
                      {new Date(row.createdAtIso ?? "").toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs uppercase">{row.id === attemptId ? "Current" : "View"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/assessment/default" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Retake assessment
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
