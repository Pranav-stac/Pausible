"use client";

import type { CSSProperties, ReactNode } from "react";
import { CTA_PRIMARY_CLASS } from "@/components/marketing/marketing-brand";

/** Desktop-first shells — use most of the viewport while staying readable. */
export const ASSESS_HEADER_MAX =
  "mx-auto w-full max-w-[920px] lg:max-w-[1080px] xl:max-w-[1200px]";
export const ASSESS_CONTENT_MAX =
  "mx-auto w-full max-w-[860px] lg:max-w-[980px] xl:max-w-[1100px]";
export const ASSESS_PAD = "px-5 sm:px-8 lg:px-10 xl:px-12";

export const ADVANCE_DELAY_MS = 420;
export const SCROLL_SETTLE_MS = 460;

export type CardVisual = {
  opacity: number;
  scale: number;
  blur: string;
  pointerEvents: "auto" | "none";
  shadow: string;
  padding: string;
  radius: string;
  textSize: string;
  background: string;
  border: string;
  textColor: string;
  numberColor: string;
  captionColor: string;
  isActive: boolean;
  isPrevious: boolean;
};

export function cardVisual(distance: number): CardVisual {
  const absDist = Math.abs(distance);
  const isActive = distance === 0;
  const isPrevious = distance < 0;

  if (isActive) {
    return {
      opacity: 1,
      scale: 1,
      blur: "none",
      pointerEvents: "auto",
      shadow: "0 30px 66px -30px rgba(2,132,199,.22)",
      padding: "clamp(32px,4.5vw,52px)",
      radius: "26px",
      textSize: "clamp(20px,2.4vw,26px)",
      background: "#0C2340",
      border: "1.5px solid rgba(255,255,255,.08)",
      textColor: "#ffffff",
      numberColor: "rgba(255,255,255,.6)",
      captionColor: "rgba(255,255,255,.55)",
      isActive: true,
      isPrevious: false,
    };
  }

  if (isPrevious) {
    return {
      opacity: 1,
      scale: absDist === 1 ? 0.98 : 0.96,
      blur: "none",
      pointerEvents: "auto",
      shadow: "0 10px 26px -20px rgba(17,24,39,.14)",
      padding: "clamp(24px,3.5vw,36px)",
      radius: "20px",
      textSize: "clamp(17px,1.6vw,19px)",
      background: "#fff",
      border: absDist === 1 ? "1.5px solid #E3F3F4" : "1px solid #EEF0F3",
      textColor: "#1F2430",
      numberColor: "#B7BCC6",
      captionColor: "#6B7280",
      isActive: false,
      isPrevious: true,
    };
  }

  if (absDist === 1) {
    return {
      opacity: 0.4,
      scale: 0.95,
      blur: "blur(1px)",
      pointerEvents: "none",
      shadow: "0 16px 40px -28px rgba(17,24,39,.16)",
      padding: "clamp(24px,3.5vw,36px)",
      radius: "22px",
      textSize: "17px",
      background: "#fff",
      border: "1px solid #F1F2F4",
      textColor: "#1F2430",
      numberColor: "#B7BCC6",
      captionColor: "#9CA3AF",
      isActive: false,
      isPrevious: false,
    };
  }

  return {
    opacity: 0.18,
    scale: 0.91,
    blur: "blur(1.5px)",
    pointerEvents: "none",
    shadow: "none",
    padding: "22px 28px",
    radius: "20px",
    textSize: "16px",
    background: "#fff",
    border: "1px solid #F1F2F4",
    textColor: "#1F2430",
    numberColor: "#B7BCC6",
    captionColor: "#9CA3AF",
    isActive: false,
    isPrevious: false,
  };
}

export function assessCardStyle(visual: CardVisual): CSSProperties {
  return {
    background: visual.background,
    borderRadius: visual.radius,
    border: visual.border,
    boxShadow: visual.shadow,
    padding: visual.padding,
    opacity: visual.opacity,
    transform: `scale(${visual.scale})`,
    filter: visual.blur,
    pointerEvents: visual.pointerEvents,
  };
}

export function AssessAtmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="assess-orb pointer-events-none fixed top-[-140px] right-[-100px] z-0 h-[480px] w-[480px] rounded-full opacity-10 blur-[100px] lg:h-[560px] lg:w-[560px]"
        style={{ background: "var(--assess-grad)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-160px] left-[-120px] z-0 h-[500px] w-[500px] rounded-full opacity-[0.07] blur-[110px] lg:h-[580px] lg:w-[580px]"
        style={{ background: "var(--assess-grad)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[38%] left-[-70px] z-0 h-[70px] w-[70px] rounded-[42%_58%_56%_44%/48%_42%_58%_52%] border-2 border-[#E3E7ED] opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[20%] right-[6%] z-0 h-11 w-11 rounded-full border-2 border-[#E3E7ED] opacity-50 lg:right-[10%]"
      />
    </>
  );
}

export function AssessGlassHeader({ children }: { children: ReactNode }) {
  return (
    <header className={`pointer-events-none fixed top-0 right-0 left-0 z-50 py-3.5 ${ASSESS_PAD}`}>
      <div
        className={`pointer-events-auto flex items-center gap-4 rounded-[18px] border border-white/70 bg-white/72 px-[18px] py-3 shadow-[0_4px_28px_-6px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-[22px] backdrop-saturate-200 sm:gap-5 sm:px-[22px] ${ASSESS_HEADER_MAX}`}
      >
        {children}
      </div>
    </header>
  );
}

export function AssessProgressBar({
  answeredCount,
  total,
  percent,
  trailing,
}: {
  answeredCount: number;
  total: number;
  percent: number;
  trailing?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-[#6B7280] sm:text-sm">
          <span className="font-bold text-[#1F2430]">{answeredCount}</span> of {total} answered
        </span>
        <div className="flex items-center gap-2">
          {trailing}
          <span className="shrink-0 text-xs font-bold whitespace-nowrap text-[var(--assess-accent)] sm:text-sm">
            {percent}%
          </span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-md bg-[#EDEFF2] sm:h-2">
        <div
          className="h-full rounded-md transition-[width] duration-[600ms] ease-[cubic-bezier(.4,0,.2,1)]"
          style={{ width: `${percent}%`, background: "var(--assess-grad)" }}
        />
      </div>
    </div>
  );
}

export function AssessIntro({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className={`relative z-[1] ${ASSESS_CONTENT_MAX} ${ASSESS_PAD} pt-[150px] pb-1 text-center sm:pt-[160px]`}>
      <div
        className="mb-[22px] inline-flex items-center gap-2.5 rounded-full px-4 py-[7px] text-[13px] font-semibold text-[var(--assess-accent)]"
        style={{ background: "var(--assess-grad-soft)" }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--assess-accent)]" />
        {badge}
      </div>
      <h1 className="m-0 mb-3 text-[clamp(26px,3.2vw,36px)] leading-[1.25] font-bold tracking-[-0.015em]">
        {title}
      </h1>
      <p className="mx-auto m-0 mb-2 max-w-3xl text-[15.5px] text-[#6B7280] sm:text-base">{subtitle}</p>
    </div>
  );
}

export function AssessCompleteOverlay({
  title,
  body,
  ctaLabel,
  onCta,
  disabled,
  busy,
  error,
  hint,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  hint?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(250,251,252,0.97)] p-6 backdrop-blur-[6px]">
      <div className="w-full max-w-[520px] text-center lg:max-w-[560px]">
        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <span
            aria-hidden
            className="assess-ripple absolute inset-0 rounded-full opacity-35"
            style={{ background: "var(--assess-grad)" }}
          />
          <span
            aria-hidden
            className="assess-ripple absolute inset-0 rounded-full opacity-35 [animation-delay:0.5s]"
            style={{ background: "var(--assess-grad)" }}
          />
          <span
            aria-hidden
            className="assess-ripple absolute inset-0 rounded-full opacity-35 [animation-delay:1s]"
            style={{ background: "var(--assess-grad)" }}
          />
          <div
            className="assess-complete-pop relative flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-[0_20px_44px_-16px_rgba(2,132,199,0.55)]"
            style={{ background: "var(--assess-grad)" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                className="assess-check-path"
                d="M5 13l4 4L19 7"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h2 className="m-0 mb-3.5 text-[clamp(26px,3.6vw,34px)] font-bold tracking-[-0.02em]">{title}</h2>
        <p className="m-0 mb-9 text-[17px] leading-[1.6] text-[#4B5563]">{body}</p>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          disabled={disabled || busy}
          onClick={onCta}
          className={`${CTA_PRIMARY_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {busy ? "Saving…" : ctaLabel}
          {!busy ? <span aria-hidden>→</span> : null}
        </button>

        {hint ? <p className="mt-4 text-sm text-amber-700">{hint}</p> : null}
      </div>
    </div>
  );
}

export function LikertCircles({
  value,
  onChange,
  scaleMin = 1,
  scaleMax = 7,
  isActive,
  disabled,
  minLabel = "Strongly disagree",
  midLabel = "Neutral",
  maxLabel = "Strongly agree",
}: {
  value?: number;
  onChange?: (n: number) => void;
  scaleMin?: number;
  scaleMax?: number;
  isActive: boolean;
  disabled?: boolean;
  minLabel?: string;
  midLabel?: string;
  maxLabel?: string;
}) {
  const min = Math.min(scaleMin, scaleMax);
  const max = Math.max(scaleMin, scaleMax);
  const nums: number[] = [];
  for (let n = min; n <= max; n++) nums.push(n);
  const mid = Math.round((min + max) / 2);

  return (
    <div className="flex items-start gap-1.5 sm:gap-2.5 lg:gap-3" role="group" aria-label="Agreement scale">
      {nums.map((n) => {
        const selected = value === n;
        let label = "";
        if (n === min) label = minLabel;
        else if (n === mid) label = midLabel;
        else if (n === max) label = maxLabel;

        const badgeBg = selected
          ? "linear-gradient(120deg,#00BFA5,#3B82F6)"
          : isActive
            ? "rgba(255,255,255,.08)"
            : "#F3F4F6";
        const badgeColor = selected ? "#fff" : isActive ? "rgba(255,255,255,.65)" : "#9CA3AF";
        const badgeBorder = selected
          ? "none"
          : isActive
            ? "1px solid rgba(255,255,255,.18)"
            : "1px solid #E5E7EB";
        const labelColor = isActive ? "rgba(255,255,255,.55)" : "#9CA3AF";

        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(n)}
            aria-label={label ? `Point ${n}, ${label}` : `Point ${n}`}
            aria-pressed={selected}
            className="flex flex-1 cursor-pointer flex-col items-center gap-2 border-0 bg-transparent p-0 pt-1 disabled:cursor-default"
          >
            <span
              className="flex aspect-square min-h-11 w-full max-w-[56px] items-center justify-center rounded-full text-[15px] font-bold transition-all duration-150 sm:min-h-12 sm:max-w-[64px] sm:text-base lg:max-w-[72px]"
              style={{ background: badgeBg, color: badgeColor, border: badgeBorder }}
            >
              {n}
            </span>
            <span
              className="min-h-[26px] text-center text-[10.5px] leading-[1.3] font-semibold sm:text-[11px]"
              style={{ color: labelColor }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SingleChoiceStack({
  options,
  value,
  onChange,
  isActive,
  disabled,
  columns = false,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
  isActive: boolean;
  disabled?: boolean;
  columns?: boolean;
}) {
  return (
    <div className={columns ? "grid gap-2 sm:grid-cols-2 sm:gap-2.5" : "grid gap-2 sm:gap-2.5"}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className="flex min-h-12 w-full cursor-pointer items-center rounded-2xl border px-4 py-3.5 text-left text-sm transition disabled:cursor-default sm:min-h-[3.25rem] sm:text-[15px]"
            style={
              active
                ? {
                    border: "none",
                    background: "linear-gradient(120deg,#00BFA5,#3B82F6)",
                    color: "#fff",
                  }
                : isActive
                  ? {
                      border: "1px solid rgba(255,255,255,.18)",
                      background: "rgba(255,255,255,.08)",
                      color: "rgba(255,255,255,.85)",
                    }
                  : {
                      border: "1px solid #E5E7EB",
                      background: "#fff",
                      color: "#4D4D4D",
                    }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function MultiChoiceStack({
  options,
  value,
  disabled,
  isActive,
  maxSelections,
  onAnswersChange,
  onContinue,
}: {
  options: string[];
  value: string[];
  disabled?: boolean;
  isActive: boolean;
  maxSelections?: number;
  onAnswersChange: (v: string[]) => void;
  onContinue: (selected: string[]) => void;
}) {
  const cap = maxSelections ?? options.length;
  const atCap = value.length >= cap;

  const toggle = (opt: string) => {
    if (disabled) return;
    if (value.includes(opt)) {
      onAnswersChange(value.filter((x) => x !== opt));
      return;
    }
    if (atCap) return;
    onAnswersChange([...value, opt]);
  };
  const canContinue = value.length > 0;

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: isActive ? "rgba(255,255,255,.55)" : "#6B7280" }}>
        {value.length}/{cap} selected{maxSelections ? ` (max ${maxSelections})` : ""}
      </p>
      {options.map((opt) => {
        const active = value.includes(opt);
        const optionDisabled = Boolean(disabled || (!active && atCap));
        return (
          <button
            key={opt}
            type="button"
            disabled={optionDisabled}
            onClick={() => toggle(opt)}
            className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-sm transition disabled:cursor-not-allowed sm:text-[15px]"
            style={
              active
                ? isActive
                  ? {
                      border: "1px solid rgba(255,255,255,.28)",
                      background: "rgba(255,255,255,.12)",
                      color: "#fff",
                    }
                  : {
                      border: "1px solid #BFDBFE",
                      background: "#F0F9FF",
                      color: "#0D1B2A",
                    }
                : optionDisabled
                  ? {
                      border: "1px solid #F3F4F6",
                      background: isActive ? "rgba(255,255,255,.04)" : "#F9FAFB",
                      color: isActive ? "rgba(255,255,255,.35)" : "#9CA3AF",
                    }
                  : isActive
                    ? {
                        border: "1px solid rgba(255,255,255,.18)",
                        background: "rgba(255,255,255,.06)",
                        color: "rgba(255,255,255,.8)",
                      }
                    : {
                        border: "1px solid #E5E7EB",
                        background: "#fff",
                        color: "#4D4D4D",
                      }
            }
          >
            <span>{opt}</span>
            <span className="text-[11px] font-semibold opacity-70">
              {active ? "Selected" : optionDisabled ? "Limit reached" : "Tap"}
            </span>
          </button>
        );
      })}
      {isActive ? (
        <>
          <p className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>
            Select any that apply, then continue.
          </p>
          <button
            type="button"
            disabled={disabled || !canContinue}
            onClick={() => onContinue(value)}
            className={`${CTA_PRIMARY_CLASS} mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Continue
          </button>
        </>
      ) : null}
    </div>
  );
}
