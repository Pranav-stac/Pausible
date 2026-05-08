"use client";

import type { DimensionRow } from "@/lib/results/dimension-rows";

export type ResultsStoryPosterData = {
  archetypeLabel: string;
  /** One-line hook under title */
  line: string;
  dimensions: Pick<DimensionRow, "label" | "pct">[];
  hashtags: string[];
  siteSlug: string;
};

function MeterRow({ label, pct, idx }: { label: string; pct: number; idx: number }) {
  const hues = ["#61aaff", "#7dd8ff", "#93daff", "#5fd4ff"];
  const c = hues[idx % hues.length];
  const c2 = hues[(idx + 1) % hues.length];
  return (
    <div className="flex items-center gap-2 rounded-xl bg-black/15 px-2.5 py-2 ring ring-white/[0.06]">
      <span className="w-[118px] shrink-0 truncate text-[11px] font-semibold tracking-wide text-white/88">{label}</span>
      <div className="relative h-[10px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.09]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: `linear-gradient(90deg, ${c} 0%, ${c2} 100%)`,
            boxShadow: `0 0 16px rgba(97,170,255,0.42)`,
          }}
        />
      </div>
      <span className="w-[36px] shrink-0 text-right text-[13px] font-bold tabular-nums text-[#c8f5ff]" style={{ textShadow: "0 0 12px rgb(125 216 255 / 40%)" }}>
        {pct}
      </span>
    </div>
  );
}

/** Exact 540×960 layout for Instagram Stories (export at pixelRatio 2 → 1080×1920). */
export function ResultsStoryPosterChrome({ archetypeLabel, line, dimensions, hashtags, siteSlug }: ResultsStoryPosterData) {
  const dims = dimensions.slice(0, 6);

  return (
    <div
      className="relative flex flex-col overflow-hidden text-left bg-[#050816]"
      style={{
        width: 540,
        height: 960,
        fontFamily: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-[#050816] via-[#0a1029] to-[#050816]" />
      <div
        className="pointer-events-none absolute -right-28 -top-24 size-[440px] rounded-full opacity-[0.12]"
        style={{ background: "radial-gradient(circle at center, rgb(125 216 255), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 size-[400px] rounded-full opacity-[0.1]"
        style={{ background: "radial-gradient(circle at center, rgb(97 170 255), transparent 72%)" }}
      />

      <svg className="pointer-events-none absolute right-8 top-[120px] w-[180px] opacity-[0.22]" height="92" viewBox="0 0 180 92" aria-hidden fill="none">
        <defs>
          <linearGradient id="storyWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#61aaff" />
            <stop offset="100%" stopColor="#7dd8ff" />
          </linearGradient>
        </defs>
        <path
          d="M 0 58 Q 42 82, 86 52 T 174 42"
          stroke="url(#storyWave)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <div className="relative z-[1] flex flex-1 flex-col px-[36px] pt-[52px]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/52">profile snapshot · trend card</p>
        <div className="mt-10">
          <h1 className="text-[32px] font-bold leading-[1.12] tracking-tight text-white" style={{ textShadow: "0 2px 32px rgb(125 216 255 / 22%)" }}>
            Your{" "}
            <span
              className="bg-linear-to-r from-[#7dd8ff] to-[#61aaff]"
              style={{
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                color: "transparent",
                display: "inline-block",
              }}
            >
              {archetypeLabel}
            </span>
          </h1>
          <p className="mt-4 max-w-[440px] text-[14px] font-medium leading-snug text-white/[0.74]">{line}</p>
        </div>

        <div className="mt-auto pb-[44px]">
          <div className="mb-6 flex items-end justify-between border-b border-white/[0.1] pb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">dimensional footprint</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-[#dff6ff]" style={{ textShadow: "0 0 20px rgb(125 216 255 / 30%)" }}>
                Behavioral mix
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {dims.map((d, i) => (
              <MeterRow key={`${d.label}-${i}`} label={d.label} pct={d.pct} idx={i} />
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2">
            {hashtags.map((h) => {
              const t = (h.startsWith("#") ? h : `#${h}`).slice(1);
              return (
                <span
                  key={t}
                  className="rounded-full border border-[#61aaff]/35 bg-black/25 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#bfebff]"
                >
                  #{t}
                </span>
              );
            })}
          </div>

          <p className="mt-10 text-center text-[12px] font-semibold tracking-[0.12em] text-white/42">{siteSlug}</p>
        </div>
      </div>
    </div>
  );
}
