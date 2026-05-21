"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "firebase/auth";
import { ResultsStoryPosterSection } from "@/components/results/ResultsStoryPosterSection";
import { personaAnimal, personaLabel } from "@/lib/results/persona-display";
import { PERSONA_REPORT_THEME } from "@/lib/results/persona-report-theme";
import type { DimensionRow } from "@/lib/results/dimension-rows";
import type { PersonaKey } from "@/lib/scoring/persona-types";
import type { SerializedAttempt } from "@/lib/local/attempts";

type PersonaCopy = { label: string; summary: string; bullets: string[] };
type PersonaMixRow = { key: PersonaKey; label: string; pct: number };
type StoryPoster = {
  archetypeLabel: string;
  line: string;
  dimensions: { label: string; pct: number }[];
  hashtags: string[];
  siteSlug: string;
};

const TRAIT_ACCENTS = [
  { from: "#38bdf8", to: "#2563eb" },
  { from: "#a78bfa", to: "#6366f1" },
  { from: "#34d399", to: "#059669" },
  { from: "#fbbf24", to: "#ea580c" },
  { from: "#f472b6", to: "#db2777" },
] as const;

function staggerStyle(i: number): CSSProperties {
  return { animationDelay: `${Math.min(i * 70, 420)}ms` };
}

function BentoCard({
  children,
  className = "",
  style,
  delay = 0,
  radius = "1.75rem",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  radius?: string;
}) {
  return (
    <div
      className={`results-bento-in relative overflow-hidden bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.22)] ${className}`}
      style={{ ...style, borderRadius: radius, ...staggerStyle(delay) }}
    >
      {children}
    </div>
  );
}

function TraitTile({ label, pct, index, compact }: { label: string; pct: number; index: number; compact?: boolean }) {
  const a = TRAIT_ACCENTS[index % TRAIT_ACCENTS.length];
  const short = label.split(" ")[0];

  if (compact) {
    return (
      <div className="results-bento-scroll-x-item w-[10.5rem] shrink-0 snap-start sm:w-[11.5rem]">
        <BentoCard delay={3 + index} radius="1.5rem" className="flex h-full min-h-[9.5rem] flex-col justify-between p-4">
          <div className="flex items-center justify-between">
            <span
              className="grid h-10 w-10 place-items-center rounded-2xl text-xs font-black text-white"
              style={{ background: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
            >
              {short.slice(0, 2).toUpperCase()}
            </span>
            <span className="text-3xl font-black tabular-nums text-slate-950">{pct}</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${a.from}, ${a.to})` }}
              />
            </div>
          </div>
        </BentoCard>
      </div>
    );
  }

  return (
    <BentoCard delay={3 + index} className="flex min-h-[8.5rem] flex-col justify-between p-4 md:min-h-[9rem] md:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
        <span className="text-2xl font-black tabular-nums text-slate-950 md:text-3xl">{pct}</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${a.from}, ${a.to})` }}
        />
      </div>
    </BentoCard>
  );
}

function MixChip({ row, isPrimary, delay }: { row: PersonaMixRow; isPrimary: boolean; delay: number }) {
  const t = PERSONA_REPORT_THEME[row.key];
  return (
    <div className="results-bento-scroll-x-item shrink-0 snap-start">
      <BentoCard
        delay={delay}
        radius="1.25rem"
        className={`min-w-[9.5rem] p-3.5 sm:min-w-[10.5rem] md:min-w-0 md:w-full ${isPrimary ? "results-bento-mesh-border" : "ring-1 ring-slate-200/90"}`}
        style={{ ["--bento-accent" as string]: t.hex }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xs font-black text-white shadow-md"
            style={{ backgroundColor: t.hex }}
          >
            {t.abbr}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700">{row.label}</p>
            <p className="text-2xl font-black tabular-nums leading-none text-slate-950">{row.pct.toFixed(0)}%</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: t.hex }} />
        </div>
      </BentoCard>
    </div>
  );
}

export function ResultsBentoSummary({
  attempt,
  attemptId,
  primaryPersona,
  secondaryPersona,
  secondaryPct,
  primaryCopy,
  secondaryCopy,
  personaMix,
  dimensionRows,
  storyPoster,
  shareUrl,
  history,
  hasGoogleIdentity,
  user,
  onCopyShare,
  onOpenReport,
  hasReport,
}: {
  attempt: SerializedAttempt;
  attemptId: string;
  primaryPersona?: string | null;
  secondaryPersona?: string | null;
  secondaryPct?: number | null;
  primaryCopy: PersonaCopy | null;
  secondaryCopy: PersonaCopy | null;
  personaMix: PersonaMixRow[];
  dimensionRows: DimensionRow[];
  storyPoster: StoryPoster;
  shareUrl: string | null;
  history: SerializedAttempt[];
  hasGoogleIdentity: boolean;
  user: User | null;
  onCopyShare: () => void;
  onOpenReport: () => void;
  hasReport: boolean;
}) {
  const primaryLabel = personaLabel(primaryPersona);
  const animal = personaAnimal(primaryPersona);
  const primaryKey = primaryPersona as PersonaKey | undefined;
  const theme = primaryKey ? PERSONA_REPORT_THEME[primaryKey] : null;
  const accent = theme?.hex ?? "#2563eb";
  const paidIso = attempt.paidAtIso ?? attempt.createdAtIso;
  const paidLabel = paidIso
    ? new Date(paidIso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const topMix = personaMix.slice(0, 6);

  return (
    <div
      className="relative scheme-light pb-24 text-slate-900 md:pb-10"
      style={{ ["--bento-accent" as string]: accent }}
    >
      {/* Ambient */}
      <div
        className="pointer-events-none absolute -left-8 top-0 h-72 w-72 rounded-full blur-3xl md:h-96"
        style={{ backgroundColor: `${accent}22` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-4 top-32 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl"
        aria-hidden
      />

      {/* Mobile-only swipe hint */}
      <p className="relative mb-4 flex items-center gap-2 px-1 text-[11px] font-medium text-slate-500 md:hidden">
        <span className="inline-flex gap-0.5" aria-hidden>
          <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
        </span>
        Swipe trait & mix rows · scroll for more
      </p>

      <div className="relative grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-6 md:gap-4 lg:grid-cols-12">
        {/* HERO */}
        <BentoCard
          delay={0}
          radius="2rem"
          className="results-bento-mesh-border md:col-span-6 lg:col-span-8 lg:row-span-2"
          style={{ backgroundColor: theme?.lightBg ?? "#f8fafc" }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full opacity-60 blur-3xl"
            style={{ backgroundColor: `${accent}35` }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -left-2 top-4 select-none font-black leading-none text-slate-950/[0.04] text-[7rem] sm:text-[9rem]"
            aria-hidden
          >
            {theme?.abbr ?? "YOU"}
          </span>

          <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-6 sm:p-7 lg:p-8">
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600 shadow-sm ring-1 ring-slate-200/80">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  Your pattern
                </span>
                <h1
                  className="mt-4 text-[1.75rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]"
                  style={{ color: accent }}
                >
                  {primaryLabel}
                </h1>
                {animal ? (
                  <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200/80">
                    <span className="text-xl">{animal.emoji}</span>
                    <span className="truncate">{animal.name}</span>
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-700 sm:mt-6 sm:text-base">
                {primaryCopy?.summary ?? "Your behavioral spotlight from the latest assessment."}
              </p>
              {hasReport ? (
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="mt-5 hidden w-full rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98] sm:mt-6 sm:inline-flex sm:w-fit sm:rounded-full sm:py-2.5 sm:text-xs"
                >
                  Open full report →
                </button>
              ) : null}
            </div>

            {animal?.imagePath ? (
              <div className="relative mx-auto aspect-square w-full max-w-[11rem] shrink-0 sm:mx-0 sm:max-w-[10.5rem] lg:max-w-[12.5rem]">
                <div
                  className="absolute inset-0 rounded-[1.75rem] opacity-90"
                  style={{
                    background: `conic-gradient(from 210deg, ${accent}, #e2e8f0, ${accent}88, #f8fafc)`,
                  }}
                  aria-hidden
                />
                <div className="absolute inset-[3px] overflow-hidden rounded-[1.6rem] bg-white">
                  <Image
                    src={animal.imagePath}
                    alt=""
                    width={200}
                    height={200}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>
              </div>
            ) : null}
          </div>
        </BentoCard>

        {/* SNAPSHOT — compact on mobile */}
        <BentoCard delay={1} className="md:col-span-3 lg:col-span-4" radius="1.5rem">
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Snapshot</p>
            <p className="mt-2 text-base font-bold tabular-nums text-slate-950 sm:text-lg">{paidLabel}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{attempt.id}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 ring-1 ring-emerald-200">
                Unlocked
              </span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Premium</span>
            </div>
          </div>
        </BentoCard>

        {/* SECONDARY */}
        <BentoCard
          delay={2}
          className="bg-linear-to-br from-sky-50 to-indigo-50/80 md:col-span-3 lg:col-span-4"
          radius="1.5rem"
        >
          <div className="flex h-full flex-col justify-center p-4 sm:p-5">
            {secondaryPersona ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">Secondary pull</p>
                <p className="mt-2 text-lg font-bold leading-tight text-slate-950 sm:text-xl">
                  {personaLabel(secondaryPersona)}
                </p>
                {secondaryPct != null ? (
                  <p className="mt-1 text-4xl font-black tabular-nums text-sky-600">{secondaryPct.toFixed(1)}%</p>
                ) : null}
                {secondaryCopy?.summary ? (
                  <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {secondaryCopy.summary}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Single focus</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  One dominant pattern — your playbook below is tuned to it.
                </p>
              </>
            )}
          </div>
        </BentoCard>

        {/* TRAITS — horizontal scroll mobile, grid desktop */}
        <div className="md:col-span-6 lg:col-span-12">
          <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Stack</p>
              <h2 className="text-lg font-black text-slate-950 sm:text-xl">Trait meters</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              0–100
            </span>
          </div>

          {dimensionRows.length === 0 ? (
            <BentoCard delay={3} className="p-5 text-sm text-slate-500">
              No dimension data for this run.
            </BentoCard>
          ) : (
            <>
              <div className="results-bento-scroll-x -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:hidden">
                {dimensionRows.map((d, idx) => (
                  <TraitTile key={d.key} label={d.label} pct={d.pct} index={idx} compact />
                ))}
              </div>
              <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                {dimensionRows.map((d, idx) => (
                  <TraitTile key={d.key} label={d.label} pct={d.pct} index={idx} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* PERSONA MIX — scroll mobile */}
        {topMix.length > 0 ? (
          <div className="md:col-span-6 lg:col-span-7">
            <div className="mb-3 px-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Blend</p>
              <h2 className="text-lg font-black text-slate-950">Persona mix</h2>
            </div>
            <div className="results-bento-scroll-x -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 lg:grid-cols-3">
              {topMix.map((row, i) => (
                <MixChip key={row.key} row={row} isPrimary={row.key === primaryPersona} delay={4 + i} />
              ))}
            </div>
          </div>
        ) : null}

        {/* PLAYBOOK */}
        <BentoCard
          delay={5}
          className={topMix.length > 0 ? "md:col-span-6 lg:col-span-5" : "md:col-span-6 lg:col-span-12"}
          radius="1.75rem"
        >
          <div className="border-b border-slate-100 bg-linear-to-r from-amber-50/80 to-orange-50/50 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800/90">Playbook</p>
            <h2 className="text-lg font-black text-slate-950">Your next moves</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {(primaryCopy?.bullets ?? []).map((b, i) => (
              <li key={b} className="flex gap-4 px-4 py-4 sm:px-6 sm:py-5">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black text-white shadow-md"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700 sm:text-[0.95rem]">{b}</p>
              </li>
            ))}
          </ul>
        </BentoCard>

        {/* POSTER */}
        <div className="md:col-span-6 lg:col-span-12">
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

        {/* SHARE */}
        {shareUrl ? (
          <BentoCard delay={7} className="overflow-hidden md:col-span-4 lg:col-span-8" radius="1.75rem">
            <div
              className="relative p-5 sm:p-7"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, #6366f1 50%, #a855f7 100%)`,
              }}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2720%27 height=%2720%27 viewBox=%270 0 20 20%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27%23ffffff%27 fill-opacity=%270.08%27%3E%3Ccircle cx=%271%27 cy=%271%27 r=%271%27/%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
              <div className="relative">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">Share</p>
                <p className="mt-2 line-clamp-3 break-all text-sm font-medium text-white sm:line-clamp-2">{shareUrl}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onCopyShare}
                    className="min-h-11 flex-1 rounded-2xl bg-white/25 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/40 active:scale-[0.98] sm:flex-none sm:rounded-full sm:py-2"
                  >
                    Copy
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`My Pausible spotlight: ${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid min-h-11 min-w-11 place-items-center rounded-2xl bg-white/20 text-xs font-bold text-white ring-1 ring-white/30 sm:rounded-full"
                  >
                    X
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Pausible: ${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="grid min-h-11 min-w-11 place-items-center rounded-2xl bg-white/20 text-xs font-bold text-white ring-1 ring-white/30 sm:rounded-full"
                  >
                    WA
                  </a>
                </div>
              </div>
            </div>
          </BentoCard>
        ) : null}

        {/* HISTORY */}
        <BentoCard delay={8} className={shareUrl ? "md:col-span-2 lg:col-span-4" : "md:col-span-6 lg:col-span-12"}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">History</p>
            <span className="text-[10px] text-slate-400">Private</span>
          </div>
          <ul className="max-h-52 space-y-1 overflow-y-auto p-2 sm:max-h-56 sm:p-3">
            {history.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/results/${row.id}`}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition active:scale-[0.99] ${
                    row.id === attemptId
                      ? "bg-sky-50 font-bold text-sky-900 ring-2 ring-sky-200"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="truncate text-xs sm:text-sm">
                    {new Date(row.createdAtIso ?? "").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide">
                    {row.id === attemptId ? (
                      <span className="text-sky-600">Now</span>
                    ) : (
                      <span className="text-slate-400">View</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </BentoCard>
      </div>

      {/* Desktop actions */}
      <div className="relative mt-8 hidden flex-wrap gap-3 md:flex">
        {hasReport ? (
          <button
            type="button"
            onClick={onOpenReport}
            className="rounded-full border border-slate-900 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Full report
          </button>
        ) : null}
        <Link
          href="/assessment/default"
          className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Retake
        </Link>
        <Link href="/" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white">
          Home
        </Link>
      </div>

      {/* Mobile sticky CTA */}
      {hasReport ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 p-3 shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.15)] backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            <button
              type="button"
              onClick={onOpenReport}
              className="min-h-12 flex-1 rounded-2xl bg-slate-950 text-sm font-bold text-white active:scale-[0.98]"
            >
              Full report
            </button>
            <Link
              href="/"
              className="grid min-h-12 min-w-12 place-items-center rounded-2xl border border-slate-200 text-xs font-bold text-slate-800"
            >
              Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-slate-200/90 bg-white/95 p-3 backdrop-blur-md md:hidden">
          <Link
            href="/assessment/default"
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 text-center text-sm font-bold leading-[3rem] text-slate-800"
          >
            Retake
          </Link>
          <Link
            href="/"
            className="min-h-12 flex-1 rounded-2xl bg-slate-950 text-center text-sm font-bold leading-[3rem] text-white"
          >
            Home
          </Link>
        </div>
      )}
    </div>
  );
}
