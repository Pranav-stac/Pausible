"use client";

import type { DimensionRow } from "@/lib/results/dimension-rows";

export type ResultsStoryPosterData = {
  archetypeLabel: string;
  /** One-line hook under title */
  line: string;
  dimensions: Pick<DimensionRow, "label" | "pct">[];
  hashtags: string[];
  siteSlug: string;
  participantDisplayName?: string | null;
  /** HTTPS, `data:` for exports, or `blob:` preview — never persisted from this repo */
  participantPhotoSrc?: string | null;
};

function participantInitials(name: string): string {
  const p = name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2);
  const s = p.map((x) => x[0]?.toUpperCase()).join("");
  return s || "?";
}

function ParticipantPortrait({
  displayName,
  photoSrc,
}: {
  displayName: string | null | undefined;
  photoSrc?: string | null;
}) {
  const label = displayName?.trim() || "";
  const initials = participantInitials(label || "?");

  const ring =
    "size-[76px] shrink-0 rounded-full ring-[3px] ring-[#61aaff]/55 ring-offset-[6px] ring-offset-[rgba(7,13,38,1)] shadow-[0_10px_32px_-6px_rgb(125,216,255,0.5),inset_0_2px_20px_-10px_rgb(125,216,255,0.12)]";

  if (photoSrc) {
    return (
      <img
        src={photoSrc}
        alt=""
        width={76}
        height={76}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        draggable={false}
        className={`object-cover bg-black/40 ${ring}`}
      />
    );
  }

  return (
    <div aria-hidden className={`grid place-items-center bg-linear-to-br from-[#1a4f9c] via-[#0f2d5e] to-[#061221] text-[22px] font-bold tabular-nums text-[#e8fbff] ${ring}`}>
      {initials}
    </div>
  );
}

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
export function ResultsStoryPosterChrome({
  archetypeLabel,
  line,
  dimensions,
  hashtags,
  siteSlug,
  participantDisplayName,
  participantPhotoSrc,
}: ResultsStoryPosterData) {
  const dims = dimensions.slice(0, 6);

  const nameLine = participantDisplayName?.trim() ?? "";
  const showIdentity = Boolean(nameLine || participantPhotoSrc);

  return (
    <div
      className="relative flex flex-col overflow-hidden text-left"
      style={{
        width: 540,
        height: 960,
        fontFamily: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: "#050816",
      }}
    >
      {/* Inline gradient so html-to-image foreignObject clones reliably */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #050816 0%, #0a1029 45%, #050816 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-28 -top-24 size-[440px] rounded-full opacity-[0.12]"
        style={{ background: "radial-gradient(circle at center, rgb(125 216 255), transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 size-[400px] rounded-full opacity-[0.1]"
        style={{ background: "radial-gradient(circle at center, rgb(97 170 255), transparent 72%)" }}
      />

      <svg className="pointer-events-none absolute right-6 top-[168px] w-[164px] opacity-[0.2]" height="92" viewBox="0 0 180 92" aria-hidden fill="none">
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

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-[32px] pt-[38px]">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-[18px]">
          <div className="min-w-0 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/52">
              Profile snapshot<span className="text-white/32"> · </span>
              <span className="text-[#93dfff]/92">Trend card</span>
            </p>
          </div>
          {/* Micro accent — fills top-right notch beside headline stack */}
          <div
            aria-hidden
            className="mt-2 h-[22px] w-[64px] shrink-0 rounded-full opacity-90"
            style={{
              background: "linear-gradient(90deg, transparent, rgb(97 170 255 / 0.45), rgb(125 216 255 / 0.55))",
            }}
          />
        </div>

        {showIdentity ? (
          <div
            className="mt-[22px] w-full rounded-[26px] p-[22px]"
            style={{
              background:
                "linear-gradient(155deg, rgb(97 170 255 / 0.1) 0%, rgb(5 13 38 / 0.72) 38%, rgb(5 11 29 / 0.88) 100%)",
              boxShadow:
                "inset 0 1px 0 rgb(125 216 255 / 0.28), 0 18px 48px -26px rgb(125 216 255 / 0.45), 0 0 0 1px rgb(97 170 255 / 0.2)",
            }}
          >
            <div className="relative flex items-center gap-5">
              <div aria-hidden className="pointer-events-none absolute -left-4 top-10 h-36 w-24 rounded-full bg-[#61aaff]/12 blur-[32px]" />
              <div className="relative flex shrink-0 flex-col items-center gap-3">
                <div className="relative">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 scale-[1.18] rounded-full bg-[radial-gradient(circle,rgb(125,216,255,0.35)_0%,transparent_70%)] blur-[8px]"
                  />
                  <ParticipantPortrait displayName={nameLine || "?"} photoSrc={participantPhotoSrc} />
                </div>
              </div>
              <div className="relative min-w-0 flex-1 pt-[6px]">
                <p className="text-[9px] font-bold uppercase tracking-[0.38em] text-[#93dfff]/92">Spotlight · you</p>
                <p
                  className="mt-4 line-clamp-2 max-h-[3.05em] overflow-hidden text-balance text-[21px] font-bold leading-[1.28] tracking-[-0.02em] text-white"
                  style={{ textShadow: "0 0 28px rgb(125 216 255 / 22%)" }}
                  title={(nameLine || "Your snapshot").length > 32 ? nameLine || "Your snapshot" : undefined}
                >
                  {nameLine || "Your snapshot"}
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <span
                    className="inline-block h-1 shrink-0 rounded-full bg-linear-to-r from-[#61aaff] via-[#7dd8ff] to-transparent"
                    style={{ width: 72 }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-semibold tracking-wide text-white/48">Powered by scoring</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`min-h-0 shrink-0 ${showIdentity ? "mt-7" : "mt-9"}`}>
          <h1 className="text-[32px] font-bold leading-[1.12] tracking-tight text-white" style={{ textShadow: "0 2px 32px rgb(125 216 255 / 22%)" }}>
            Your{" "}
            <span className="text-[#8fe6ff]" style={{ textShadow: "0 0 24px rgb(125 216 255 / 45%)" }}>
              {archetypeLabel}
            </span>
          </h1>
          <p className="mt-4 max-w-[440px] text-[14px] font-medium leading-[1.5] text-white/[0.74]">{line}</p>
        </div>

        {/* Absorbs extra vertical rhythm so meters sit lower — visually fills IG story pillar */}
        <div className="min-h-[20px] grow" aria-hidden />

        <div className="mt-auto shrink-0 pb-[44px]">
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
