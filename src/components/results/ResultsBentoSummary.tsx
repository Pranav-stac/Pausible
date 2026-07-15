"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { OceanRadarChart } from "@/components/results/OceanRadarChart";
import { personaAnimal, personaLabel } from "@/lib/results/persona-display";
import { DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import type { PersonaAnalysis, PersonaKey } from "@/lib/scoring/persona-types";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import { PERSONA_REPORT_THEME } from "@/lib/results/persona-report-theme";
import type { DimensionRow } from "@/lib/results/dimension-rows";
import type { SerializedAttempt } from "@/lib/local/attempts";
import {
  formatAttemptListDate,
  resolveAttemptDisplayName,
} from "@/lib/results/attempt-display-name";
import {
  APP_BODY,
  APP_CONTENT,
  APP_HEADING_LG,
  APP_MUTED,
  CARD_SURFACE_CLASS,
  CTA_PRIMARY_CLASS,
  CTA_SECONDARY_CLASS,
  LABEL_CLASS,
} from "@/components/marketing/marketing-brand";

type PersonaCopy = { label: string; summary: string; bullets: string[] };
type PersonaMixRow = { key: PersonaKey; label: string; pct: number };

const TRAIT_COLORS = ["#2D82FF", "#00C9C8", "#6366f1", "#f59e0b", "#ec4899"] as const;

function fadeIn(delayMs: number): CSSProperties {
  return { animationDelay: `${delayMs}ms` };
}

function Panel({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`results-bento-in ${CARD_SURFACE_CLASS} ${className}`} style={fadeIn(delay)}>
      {children}
    </div>
  );
}

function TraitMeterRow({ row, index }: { row: DimensionRow; index: number }) {
  const color = TRAIT_COLORS[index % TRAIT_COLORS.length];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[8rem_1fr_auto]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6E7191] sm:text-[11px]">{row.label}</p>
      <div className="col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:col-span-1 sm:col-start-2">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${row.pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-right sm:col-start-3">
        <span className="text-lg font-bold tabular-nums text-[#0D1B2A]">{row.scoreFormatted}</span>
        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-[#6E7191]">{row.bandLabel}</span>
      </div>
    </div>
  );
}

function MixRow({ row, isPrimary, accent }: { row: PersonaMixRow; isPrimary: boolean; accent: string }) {
  const theme = PERSONA_REPORT_THEME[row.key];
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[10px] font-bold text-white"
        style={{ backgroundColor: theme.hex }}
      >
        {theme.abbr}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate text-sm font-semibold ${isPrimary ? "text-[#0D1B2A]" : "text-[#4D4D4D]"}`}>
            {row.label}
            {isPrimary ? (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#00A8A7]">Primary</span>
            ) : null}
          </p>
          <span className="shrink-0 text-sm font-bold tabular-nums text-[#0D1B2A]">{row.pct.toFixed(0)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full"
            style={{
              width: `${row.pct}%`,
              backgroundColor: isPrimary ? accent : theme.hex,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function ResultsBentoSummary({
  attempt,
  attemptId,
  primaryPersona,
  personaTitle,
  fitScore,
  fitTier,
  personaAnalysis,
  secondaryPersona,
  secondaryPct,
  primaryCopy,
  secondaryCopy,
  personaMix,
  dimensionRows,
  shareUrl,
  history,
  onCopyShare,
  onOpenReport,
  hasReport,
}: {
  attempt: SerializedAttempt;
  attemptId: string;
  primaryPersona?: string | null;
  personaTitle?: string | null;
  fitScore?: number | null;
  fitTier?: string | null;
  personaAnalysis?: PersonaAnalysis | null;
  secondaryPersona?: string | null;
  secondaryPct?: number | null;
  primaryCopy: PersonaCopy | null;
  secondaryCopy: PersonaCopy | null;
  personaMix: PersonaMixRow[];
  dimensionRows: DimensionRow[];
  shareUrl: string | null;
  history: SerializedAttempt[];
  onCopyShare: () => void;
  onOpenReport: () => void;
  hasReport: boolean;
}) {
  const primaryLabel = personaLabel(primaryPersona);
  const animal = personaAnimal(primaryPersona);
  const primaryKey = primaryPersona as PersonaKey | undefined;
  const theme = primaryKey ? PERSONA_REPORT_THEME[primaryKey] : null;
  const accent = theme?.hex ?? "#2D82FF";
  const paidIso = attempt.paidAtIso ?? attempt.createdAtIso;
  const paidLabel = paidIso
    ? new Date(paidIso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const topMix = personaMix.slice(0, 6);
  const headline = personaTitle ?? primaryLabel;

  return (
    <div className={`${APP_CONTENT} pb-28 md:pb-14`}>
      {/* Hero */}
      <Panel delay={0} className="overflow-hidden !p-0">
        <div
          className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10 lg:p-10"
          style={{ background: `linear-gradient(135deg, ${theme?.lightBg ?? "#F7F9FB"} 0%, #ffffff 55%)` }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-40 blur-3xl"
            style={{ backgroundColor: accent }}
            aria-hidden
          />

          <div className="relative min-w-0">
            <p className={LABEL_CLASS}>Your pattern</p>
            <h1 className={`mt-3 ${APP_HEADING_LG}`} style={{ color: accent }}>
              {headline}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {animal ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1.5 text-sm font-semibold text-[#0D1B2A]">
                  <span aria-hidden>{animal.emoji}</span>
                  {animal.name}
                </span>
              ) : null}
              {fitScore != null ? (
                <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#4D4D4D] ring-1 ring-slate-200/80">
                  {fitTier ? `${fitTierLabel(fitTier as "classic")} · ` : ""}
                  {Math.round(fitScore)}% persona fit
                </span>
              ) : null}
            </div>

            <p className={`mt-5 max-w-xl ${APP_BODY}`}>
              {primaryCopy?.summary ?? "Your behavioral spotlight from the latest assessment."}
            </p>

            {hasReport ? (
              <button type="button" onClick={onOpenReport} className={`mt-6 ${CTA_PRIMARY_CLASS}`}>
                Open full report →
              </button>
            ) : null}
          </div>

          {animal?.imagePath ? (
            <div className="relative mx-auto shrink-0 lg:mx-0">
              <div
                className="absolute -inset-3 rounded-[2rem] opacity-30 blur-xl"
                style={{ background: `linear-gradient(135deg, ${accent}, #00C9C8)` }}
                aria-hidden
              />
              <div className="relative h-44 w-44 overflow-hidden rounded-[1.75rem] border-2 border-white shadow-[0_20px_50px_-20px_rgba(13,27,42,0.25)] sm:h-52 sm:w-52">
                <Image
                  src={animal.imagePath}
                  alt={animal.name}
                  width={208}
                  height={208}
                  className="h-full w-full object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-[#0D1B2A]/70 to-transparent px-3 pb-3 pt-8">
                  <p className="text-center text-sm font-bold text-white">{animal.emoji} {animal.name}</p>
                </div>
              </div>
            </div>
          ) : animal ? (
            <div
              className="grid h-44 w-44 place-items-center rounded-[1.75rem] text-6xl sm:h-52 sm:w-52"
              style={{ backgroundColor: theme?.lightBg ?? "#F7F9FB" }}
              aria-label={animal.name}
            >
              {animal.emoji}
            </div>
          ) : null}
        </div>
      </Panel>

      {/* Snapshot + secondary */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-5">
        <Panel delay={80} className="!p-5 sm:!p-6">
          <p className={LABEL_CLASS}>Snapshot</p>
          <p className="mt-2 text-lg font-bold tabular-nums text-[#0D1B2A]">{paidLabel}</p>
          <p className="mt-1 truncate font-mono text-[10px] text-[#6E7191]">{attempt.id}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/80">
              Unlocked
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-[#4D4D4D]">Premium</span>
          </div>
        </Panel>

        <Panel delay={120} className="!p-5 sm:!p-6">
          {secondaryPersona ? (
            <>
              <p className={`${LABEL_CLASS} !text-[#2D82FF]`}>Secondary pull</p>
              <p className="mt-2 text-xl font-bold text-[#0D1B2A]">{personaLabel(secondaryPersona)}</p>
              {secondaryPct != null ? (
                <p className="mt-1 text-3xl font-bold tabular-nums text-[#2D82FF]">{secondaryPct.toFixed(1)}%</p>
              ) : null}
              {secondaryCopy?.summary ? (
                <p className={`mt-2 line-clamp-3 ${APP_MUTED}`}>{secondaryCopy.summary}</p>
              ) : null}
            </>
          ) : (
            <>
              <p className={LABEL_CLASS}>Single focus</p>
              <p className={`mt-2 ${APP_BODY}`}>One dominant pattern — your playbook below is tuned to it.</p>
            </>
          )}
        </Panel>
      </div>

      {/* Trait meters */}
      <Panel delay={160} className="mt-4 !p-5 sm:!p-6 lg:mt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={LABEL_CLASS}>Stack</p>
            <h2 className="mt-1 text-xl font-bold text-[#0D1B2A]">Trait meters</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-[#6E7191]">
            Score 1–7 · Low / Medium / High
          </span>
        </div>

        {dimensionRows.length === 0 ? (
          <p className={`mt-5 ${APP_MUTED}`}>No dimension data for this run.</p>
        ) : (
          <div className="mt-6 space-y-5">
            {dimensionRows.map((row, idx) => (
              <TraitMeterRow key={row.key} row={row} index={idx} />
            ))}
          </div>
        )}
      </Panel>

      {/* Radar + mix */}
      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-2">
        {personaAnalysis && primaryKey ? (
          <Panel delay={200} className="flex flex-col items-center !p-6 sm:!p-8">
            <p className={LABEL_CLASS}>Where you stand</p>
            <h2 className="mt-1 text-xl font-bold text-[#0D1B2A]">Wellness profile</h2>
            <p className={`mt-1 text-center ${APP_MUTED}`}>
              Your traits vs. the {animal?.name ?? primaryLabel} pattern
            </p>
            <div className="mt-5">
              <OceanRadarChart
                userScores={personaAnalysis.traitAverages}
                centroidScores={DEFAULT_PERSONA_CENTROIDS[primaryKey]}
                accent={accent}
              />
            </div>
          </Panel>
        ) : null}

        {topMix.length > 0 ? (
          <Panel delay={240} className="!p-5 sm:!p-6">
            <p className={LABEL_CLASS}>Blend</p>
            <h2 className="mt-1 text-xl font-bold text-[#0D1B2A]">Persona mix</h2>
            <div className="mt-5 space-y-4">
              {topMix.map((row) => (
                <MixRow key={row.key} row={row} isPrimary={row.key === primaryPersona} accent={accent} />
              ))}
            </div>
          </Panel>
        ) : null}
      </div>

      {/* Playbook */}
      {(primaryCopy?.bullets.length ?? 0) > 0 ? (
        <Panel delay={280} className="mt-4 overflow-hidden !p-0 lg:mt-5">
          <div className="border-b border-slate-100 bg-linear-to-r from-[#F7F9FB] to-white px-5 py-4 sm:px-6">
            <p className={LABEL_CLASS}>Playbook</p>
            <h2 className="mt-1 text-xl font-bold text-[#0D1B2A]">Your next moves</h2>
          </div>
          <ol className="divide-y divide-slate-100">
            {primaryCopy!.bullets.map((bullet, i) => (
              <li key={bullet} className="flex gap-4 px-5 py-4 sm:px-6 sm:py-5">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${accent}, #00C9C8)` }}
                >
                  {i + 1}
                </span>
                <p className={`min-w-0 flex-1 pt-1.5 ${APP_BODY}`}>{bullet}</p>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {/* Share + history */}
      <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-12">
        {shareUrl ? (
          <Panel delay={320} className="overflow-hidden !p-0 lg:col-span-8">
            <div className="bg-linear-to-br from-[#00C9C8] via-[#1aabdf] to-[#2D82FF] p-5 sm:p-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">Share</p>
              <p className="mt-2 line-clamp-2 break-all text-sm font-medium text-white">{shareUrl}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onCopyShare}
                  className="min-h-10 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold text-white ring-1 ring-white/35 transition hover:bg-white/30"
                >
                  Copy link
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My Pausible spotlight: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid min-h-10 min-w-10 place-items-center rounded-xl bg-white/15 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
                >
                  X
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Pausible: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="grid min-h-10 min-w-10 place-items-center rounded-xl bg-white/15 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
                >
                  WA
                </a>
              </div>
            </div>
          </Panel>
        ) : null}

        <Panel delay={360} className={`overflow-hidden !p-0 ${shareUrl ? "lg:col-span-4" : "lg:col-span-12"}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <p className={LABEL_CLASS}>History</p>
            <span className="text-[10px] font-medium text-[#6E7191]">Private</span>
          </div>
          <ul className="max-h-52 space-y-1 overflow-y-auto p-2 sm:max-h-56 sm:p-3">
            {history.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/results/${row.id}`}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                    row.id === attemptId
                      ? "bg-[#2D82FF]/8 font-semibold text-[#0D1B2A] ring-2 ring-[#2D82FF]/20"
                      : "text-[#4D4D4D] hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0 truncate text-xs sm:text-sm">
                    <span className="font-semibold text-[#0D1B2A]">{resolveAttemptDisplayName(row)}</span>
                    <span className="mt-0.5 block text-[10px] font-medium text-[#6E7191] sm:inline sm:mt-0">
                      <span className="hidden sm:inline"> · </span>
                      {formatAttemptListDate(row.createdAtIso)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#6E7191]">
                    {row.id === attemptId ? "Now" : "View"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Desktop footer actions */}
      <div className="mt-8 hidden flex-wrap gap-3 md:flex">
        {hasReport ? (
          <button type="button" onClick={onOpenReport} className={CTA_SECONDARY_CLASS}>
            Full report
          </button>
        ) : null}
        <Link href="/assessment/default" className={CTA_SECONDARY_CLASS}>
          Retake
        </Link>
        <Link href="/" className={CTA_PRIMARY_CLASS}>
          Home
        </Link>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 p-3 shadow-[0_-8px_30px_-12px_rgba(13,27,42,0.12)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          {hasReport ? (
            <button
              type="button"
              onClick={onOpenReport}
              className={`min-h-12 flex-1 ${CTA_PRIMARY_CLASS} !min-h-12 !rounded-xl !py-0`}
            >
              Full report
            </button>
          ) : (
            <Link
              href="/assessment/default"
              className={`min-h-12 flex-1 ${CTA_SECONDARY_CLASS} !min-h-12 !rounded-xl !py-0`}
            >
              Retake
            </Link>
          )}
          <Link href="/" className={`min-h-12 shrink-0 ${CTA_SECONDARY_CLASS} !min-h-12 !rounded-xl !px-4 !py-0`}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
