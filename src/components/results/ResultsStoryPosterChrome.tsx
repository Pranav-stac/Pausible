"use client";

import type { DimensionRow } from "@/lib/results/dimension-rows";

export type ResultsStoryPosterData = {
  archetypeLabel: string;
  line: string;
  dimensions: Pick<DimensionRow, "label" | "pct">[];
  hashtags: string[];
  siteSlug: string;
  participantDisplayName?: string | null;
  participantPhotoSrc?: string | null;
  personaTitle?: string | null;
  fitScore?: number | null;
  animalEmoji?: string | null;
  animalImagePath?: string | null;
};

export type StoryPosterTheme = "dark" | "light";

function participantInitials(name: string): string {
  const p = name.trim().split(/\s+/u).filter(Boolean).slice(0, 2);
  return p.map((x) => x[0]?.toUpperCase()).join("") || "?";
}

function PortraitRing({
  displayName,
  photoSrc,
  accent,
}: {
  displayName: string;
  photoSrc?: string | null;
  accent: string;
}) {
  const initials = participantInitials(displayName || "?");

  return (
    <div className="relative shrink-0">
      <div
        className="absolute -inset-1 rounded-full opacity-80 blur-sm"
        style={{ background: `linear-gradient(135deg, ${accent}, #6366f1)` }}
        aria-hidden
      />
      <div className="relative size-[72px] overflow-hidden rounded-full ring-[3px] ring-white shadow-lg">
        {photoSrc ? (
          <img src={photoSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" draggable={false} />
        ) : (
          <div
            className="grid h-full w-full place-items-center text-xl font-black text-white"
            style={{ background: `linear-gradient(145deg, ${accent}, #6366f1)` }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

function TraitMeter({ label, pct, idx, accent }: { label: string; pct: number; idx: number; accent: string }) {
  const hues = ["#0ea5e9", "#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b"] as const;
  const c = hues[idx % hues.length];

  return (
    <div className="rounded-2xl bg-white/90 px-3 py-2.5 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{label.split(" ")[0]}</span>
        <span className="text-sm font-black tabular-nums text-slate-900">{pct}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: idx === 0 ? `linear-gradient(90deg, ${accent}, ${c})` : `linear-gradient(90deg, ${c}, ${accent}88)`,
          }}
        />
      </div>
    </div>
  );
}

/** Exact 540×960 — export at pixelRatio 2 → 1080×1920 */
export function ResultsStoryPosterChrome({
  archetypeLabel,
  line,
  dimensions,
  hashtags,
  siteSlug,
  participantDisplayName,
  participantPhotoSrc,
  personaTitle,
  fitScore,
  animalEmoji,
  animalImagePath,
  theme = "light",
}: ResultsStoryPosterData & { theme?: StoryPosterTheme }) {
  const light = theme === "light";
  const accent = light ? "#0284c7" : "#61aaff";
  const dims = dimensions.slice(0, 5);
  const nameLine = participantDisplayName?.trim() ?? "";
  const headline = personaTitle ?? archetypeLabel;

  const bg = light
    ? "linear-gradient(165deg, #f0f9ff 0%, #ffffff 38%, #f8fafc 72%, #eef2ff 100%)"
    : "linear-gradient(165deg, #050816 0%, #0a1029 45%, #050816 100%)";

  return (
    <div
      className="relative flex flex-col overflow-hidden text-left"
      style={{
        width: 540,
        height: 960,
        fontFamily: 'var(--font-geist-sans, system-ui), "Segoe UI", sans-serif',
        background: bg,
      }}
    >
      {/* Mesh blobs */}
      <div
        className="pointer-events-none absolute -right-24 -top-20 size-[420px] rounded-full blur-3xl"
        style={{ backgroundColor: light ? `${accent}28` : `${accent}18` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-20 size-[360px] rounded-full blur-3xl"
        style={{ backgroundColor: light ? "#a78bfa28" : "#6366f118" }}
        aria-hidden
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-8 pt-10 pb-10">
        {/* Brand row */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>Pausible</span>
          <span
            className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
              light ? "bg-sky-100 text-sky-800" : "bg-white/10 text-white/70"
            }`}
          >
            Wellness report
          </span>
        </div>

        {/* Identity */}
        {nameLine ? (
          <div className="mt-6 flex items-center gap-4">
            <PortraitRing displayName={nameLine} photoSrc={participantPhotoSrc} accent={accent} />
            <div className="min-w-0">
              <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${light ? "text-sky-600" : "text-[#93dfff]"}`}>
                My snapshot
              </p>
              <p className={`mt-1 truncate text-lg font-black ${light ? "text-slate-950" : "text-white"}`}>{nameLine}</p>
            </div>
          </div>
        ) : null}

        {/* Hero — animal + title */}
        <div className="mt-8 flex flex-col items-center text-center">
          <div
            className="relative flex size-36 items-center justify-center rounded-full sm:size-40"
            style={{
              background: `conic-gradient(from 200deg, ${accent}, ${light ? "#e2e8f0" : "#1e293b"} 40%, ${accent}66)`,
              boxShadow: `0 20px 50px -16px ${accent}55`,
            }}
          >
            <div className={`absolute inset-2.5 rounded-full ${light ? "bg-white" : "bg-slate-900/80"}`} />
            {animalImagePath ? (
              <img
                src={animalImagePath}
                alt=""
                className="relative z-10 size-20 rounded-2xl object-cover"
                draggable={false}
              />
            ) : (
              <span className="relative z-10 text-5xl">{animalEmoji ?? "✦"}</span>
            )}
          </div>

          <h1
            className={`mt-6 max-w-[420px] text-[26px] font-black leading-[1.12] tracking-tight ${light ? "text-slate-950" : "text-white"}`}
          >
            {headline}
          </h1>

          {fitScore != null ? (
            <div
              className="mt-4 inline-flex items-baseline gap-1.5 rounded-full px-4 py-2 ring-1"
              style={{
                backgroundColor: light ? `${accent}0d` : `${accent}22`,
                borderColor: light ? `${accent}33` : `${accent}44`,
              }}
            >
              <span className="text-2xl font-black tabular-nums" style={{ color: accent }}>
                {Math.round(fitScore)}%
              </span>
              <span className={`text-xs font-semibold ${light ? "text-slate-600" : "text-white/75"}`}>persona fit</span>
            </div>
          ) : null}

          <p className={`mt-4 max-w-sm text-sm font-medium leading-relaxed ${light ? "text-slate-600" : "text-white/70"}`}>
            {line}
          </p>
        </div>

        <div className="min-h-[16px] grow" aria-hidden />

        {/* Trait meters */}
        <div>
          <p className={`mb-3 text-[10px] font-bold uppercase tracking-[0.22em] ${light ? "text-slate-500" : "text-white/45"}`}>
            Behavioral footprint
          </p>
          <div className="grid grid-cols-2 gap-2">
            {dims.map((d, i) => (
              <TraitMeter key={d.label} label={d.label} pct={d.pct} idx={i} accent={accent} />
            ))}
          </div>
        </div>

        {/* Hashtags + site */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {hashtags.slice(0, 3).map((h) => {
            const t = (h.startsWith("#") ? h : `#${h}`).slice(1);
            return (
              <span
                key={t}
                className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                  light ? "bg-white text-sky-800 ring-1 ring-sky-200" : "bg-white/10 text-white/85 ring-1 ring-white/15"
                }`}
              >
                #{t}
              </span>
            );
          })}
        </div>
        <p className={`mt-5 text-center text-[11px] font-semibold tracking-wide ${light ? "text-slate-400" : "text-white/40"}`}>
          {siteSlug}
        </p>
      </div>
    </div>
  );
}
