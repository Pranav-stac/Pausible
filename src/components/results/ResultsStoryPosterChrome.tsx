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
};

export type StoryPosterTheme = "dark" | "light";

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
  light,
}: {
  displayName: string | null | undefined;
  photoSrc?: string | null;
  light: boolean;
}) {
  const label = displayName?.trim() || "";
  const initials = participantInitials(label || "?");

  const ring = light
    ? "size-[76px] shrink-0 rounded-full ring-[3px] ring-sky-300 ring-offset-[6px] ring-offset-white shadow-[0_12px_28px_-8px_rgba(14,165,233,0.45)]"
    : "size-[76px] shrink-0 rounded-full ring-[3px] ring-[#61aaff]/55 ring-offset-[6px] ring-offset-[rgba(7,13,38,1)] shadow-[0_10px_32px_-6px_rgb(125,216,255,0.5),inset_0_2px_20px_-10px_rgb(125,216,255,0.12)]";

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
        className={`object-cover ${light ? "bg-slate-100" : "bg-black/40"} ${ring}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`grid place-items-center text-[22px] font-bold tabular-nums ${ring} ${
        light
          ? "bg-linear-to-br from-sky-100 via-indigo-100 to-violet-100 text-indigo-900"
          : "bg-linear-to-br from-[#1a4f9c] via-[#0f2d5e] to-[#061221] text-[#e8fbff]"
      }`}
    >
      {initials}
    </div>
  );
}

function MeterRow({ label, pct, idx, light }: { label: string; pct: number; idx: number; light: boolean }) {
  const hues = light
    ? (["#0ea5e9", "#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b"] as const)
    : (["#61aaff", "#7dd8ff", "#93daff", "#5fd4ff"] as const);
  const c = hues[idx % hues.length];
  const c2 = hues[(idx + 1) % hues.length];

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ${
        light ? "bg-slate-100/90 ring-1 ring-slate-200/80" : "bg-black/15 ring ring-white/[0.06]"
      }`}
    >
      <span
        className={`w-[118px] shrink-0 truncate text-[11px] font-semibold tracking-wide ${
          light ? "text-slate-700" : "text-white/88"
        }`}
      >
        {label}
      </span>
      <div className={`relative h-[10px] min-w-0 flex-1 overflow-hidden rounded-full ${light ? "bg-slate-200" : "bg-white/[0.09]"}`}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: `linear-gradient(90deg, ${c} 0%, ${c2} 100%)`,
            boxShadow: light ? "none" : `0 0 16px rgba(97,170,255,0.42)`,
          }}
        />
      </div>
      <span
        className={`w-[36px] shrink-0 text-right text-[13px] font-bold tabular-nums ${
          light ? "text-slate-900" : "text-[#c8f5ff]"
        }`}
        style={light ? undefined : { textShadow: "0 0 12px rgb(125 216 255 / 40%)" }}
      >
        {pct}
      </span>
    </div>
  );
}

/** Exact 540×960 — export at pixelRatio 2 → 1080×1920. Use `theme="dark"` for file export. */
export function ResultsStoryPosterChrome({
  archetypeLabel,
  line,
  dimensions,
  hashtags,
  siteSlug,
  participantDisplayName,
  participantPhotoSrc,
  theme = "dark",
}: ResultsStoryPosterData & { theme?: StoryPosterTheme }) {
  const light = theme === "light";
  const dims = dimensions.slice(0, 6);
  const nameLine = participantDisplayName?.trim() ?? "";
  const showIdentity = Boolean(nameLine || participantPhotoSrc);

  const bg = light ? "#fafbfc" : "#050816";
  const grad = light
    ? "linear-gradient(180deg, #ffffff 0%, #f1f5f9 42%, #e2e8f0 100%)"
    : "linear-gradient(180deg, #050816 0%, #0a1029 45%, #050816 100%)";

  return (
    <div
      className="relative flex flex-col overflow-hidden text-left"
      style={{
        width: 540,
        height: 960,
        fontFamily: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        backgroundColor: bg,
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: grad }} />
      <div
        className="pointer-events-none absolute -right-28 -top-24 size-[440px] rounded-full"
        style={{
          opacity: light ? 0.35 : 0.12,
          background: light
            ? "radial-gradient(circle at center, rgb(186 230 253), transparent 70%)"
            : "radial-gradient(circle at center, rgb(125 216 255), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 size-[400px] rounded-full"
        style={{
          opacity: light ? 0.3 : 0.1,
          background: light
            ? "radial-gradient(circle at center, rgb(199 210 254), transparent 72%)"
            : "radial-gradient(circle at center, rgb(97 170 255), transparent 72%)",
        }}
      />

      <svg
        className={`pointer-events-none absolute right-6 top-[168px] w-[164px] ${light ? "opacity-[0.35]" : "opacity-[0.2]"}`}
        height="92"
        viewBox="0 0 180 92"
        aria-hidden
        fill="none"
      >
        <defs>
          <linearGradient id="storyWave" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={light ? "#0ea5e9" : "#61aaff"} />
            <stop offset="100%" stopColor={light ? "#6366f1" : "#7dd8ff"} />
          </linearGradient>
        </defs>
        <path d="M 0 58 Q 42 82, 86 52 T 174 42" stroke="url(#storyWave)" strokeWidth={3} strokeLinecap="round" fill="none" />
      </svg>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-[32px] pt-[38px]">
        <div
          className={`flex items-start justify-between gap-3 border-b pb-[18px] ${
            light ? "border-slate-200/90" : "border-white/[0.08]"
          }`}
        >
          <div className="min-w-0 pt-1">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.32em] ${
                light ? "text-slate-500" : "text-white/52"
              }`}
            >
              Profile snapshot<span className={light ? "text-slate-300" : "text-white/32"}> · </span>
              <span className={light ? "text-sky-600" : "text-[#93dfff]/92"}>Trend card</span>
            </p>
          </div>
          <div
            aria-hidden
            className="mt-2 h-[22px] w-[64px] shrink-0 rounded-full opacity-90"
            style={{
              background: light
                ? "linear-gradient(90deg, transparent, rgb(14 165 233 / 0.35), rgb(99 102 241 / 0.4))"
                : "linear-gradient(90deg, transparent, rgb(97 170 255 / 0.45), rgb(125 216 255 / 0.55))",
            }}
          />
        </div>

        {showIdentity ? (
          <div
            className="mt-[22px] w-full rounded-[26px] p-[22px]"
            style={
              light
                ? {
                    background: "linear-gradient(155deg, #f0f9ff 0%, #ffffff 45%, #f8fafc 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgb(255 255 255), 0 16px 40px -24px rgb(14 165 233 / 0.25), 0 0 0 1px rgb(226 232 240)",
                  }
                : {
                    background:
                      "linear-gradient(155deg, rgb(97 170 255 / 0.1) 0%, rgb(5 13 38 / 0.72) 38%, rgb(5 11 29 / 0.88) 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgb(125 216 255 / 0.28), 0 18px 48px -26px rgb(125 216 255 / 0.45), 0 0 0 1px rgb(97 170 255 / 0.2)",
                  }
            }
          >
            <div className="relative flex items-center gap-5">
              <div
                aria-hidden
                className={`pointer-events-none absolute -left-4 top-10 h-36 w-24 rounded-full blur-[32px] ${
                  light ? "bg-sky-200/50" : "bg-[#61aaff]/12"
                }`}
              />
              <div className="relative flex shrink-0 flex-col items-center gap-3">
                <div className="relative">
                  {!light ? (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 scale-[1.18] rounded-full bg-[radial-gradient(circle,rgb(125,216,255,0.35)_0%,transparent_70%)] blur-[8px]"
                    />
                  ) : null}
                  <ParticipantPortrait displayName={nameLine || "?"} photoSrc={participantPhotoSrc} light={light} />
                </div>
              </div>
              <div className="relative min-w-0 flex-1 pt-[6px]">
                <p
                  className={`text-[9px] font-bold uppercase tracking-[0.38em] ${
                    light ? "text-sky-600" : "text-[#93dfff]/92"
                  }`}
                >
                  Spotlight · you
                </p>
                <p
                  className={`mt-4 line-clamp-2 max-h-[3.05em] overflow-hidden text-balance text-[21px] font-bold leading-[1.28] tracking-[-0.02em] ${
                    light ? "text-slate-950" : "text-white"
                  }`}
                  title={(nameLine || "Your snapshot").length > 32 ? nameLine || "Your snapshot" : undefined}
                >
                  {nameLine || "Your snapshot"}
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <span
                    className={`inline-block h-1 shrink-0 rounded-full bg-linear-to-r to-transparent ${
                      light ? "from-sky-500 via-indigo-400" : "from-[#61aaff] via-[#7dd8ff]"
                    }`}
                    style={{ width: 72 }}
                    aria-hidden
                  />
                  <span className={`text-[11px] font-semibold tracking-wide ${light ? "text-slate-500" : "text-white/48"}`}>
                    Powered by scoring
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`min-h-0 shrink-0 ${showIdentity ? "mt-7" : "mt-9"}`}>
          <h1
            className={`text-[32px] font-bold leading-[1.12] tracking-tight ${light ? "text-slate-950" : "text-white"}`}
            style={light ? undefined : { textShadow: "0 2px 32px rgb(125 216 255 / 22%)" }}
          >
            Your{" "}
            <span
              className={light ? "text-sky-600" : "text-[#8fe6ff]"}
              style={light ? undefined : { textShadow: "0 0 24px rgb(125 216 255 / 45%)" }}
            >
              {archetypeLabel}
            </span>
          </h1>
          <p className={`mt-4 max-w-[440px] text-[14px] font-medium leading-[1.5] ${light ? "text-slate-600" : "text-white/[0.74]"}`}>
            {line}
          </p>
        </div>

        <div className="min-h-[20px] grow" aria-hidden />

        <div className="mt-auto shrink-0 pb-[44px]">
          <div className={`mb-6 flex items-end justify-between border-b pb-5 ${light ? "border-slate-200" : "border-white/[0.1]"}`}>
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${light ? "text-slate-500" : "text-white/45"}`}>
                dimensional footprint
              </p>
              <p
                className={`mt-2 text-xl font-semibold tracking-tight ${light ? "text-slate-900" : "text-[#dff6ff]"}`}
                style={light ? undefined : { textShadow: "0 0 20px rgb(125 216 255 / 30%)" }}
              >
                Behavioral mix
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {dims.map((d, i) => (
              <MeterRow key={`${d.label}-${i}`} label={d.label} pct={d.pct} idx={i} light={light} />
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2">
            {hashtags.map((h) => {
              const t = (h.startsWith("#") ? h : `#${h}`).slice(1);
              return (
                <span
                  key={t}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide ${
                    light
                      ? "border border-sky-200 bg-sky-50 text-sky-800"
                      : "border border-[#61aaff]/35 bg-black/25 text-[#bfebff]"
                  }`}
                >
                  #{t}
                </span>
              );
            })}
          </div>

          <p className={`mt-10 text-center text-[12px] font-semibold tracking-[0.12em] ${light ? "text-slate-400" : "text-white/42"}`}>
            {siteSlug}
          </p>
        </div>
      </div>
    </div>
  );
}
