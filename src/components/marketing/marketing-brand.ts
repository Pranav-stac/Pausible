/** Pausibl brand palette — matches marketing design references */
export const BRAND = {
  teal: "#00C9C8",
  blue: "#2D82FF",
  navy: "#0D1B2A",
  textMuted: "#4D4D4D",
  textLight: "#6E7191",
  bgSoft: "#F7F9FB",
  bgSection: "#F9F9F9",
} as const;

export const GRADIENT_TEXT =
  "bg-linear-to-r from-[#00C9C8] to-[#2D82FF] bg-clip-text text-transparent";

export const GRADIENT_BG = "bg-linear-to-r from-[#00C9C8] to-[#2D82FF]";

export const GRADIENT_BG_HOVER = "hover:from-[#00b8b7] hover:to-[#2574ee]";

export const GRADIENT_CTA_BG =
  "bg-linear-to-br from-[#00C9C8] via-[#1aabdf] to-[#2D82FF]";

export const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00A8A7] sm:text-xs";

/** Primary marketing CTA — brand gradient, no neon outer glow */
export const CTA_PRIMARY_CLASS =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2D82FF] px-7 py-3 text-sm font-semibold text-white ring-1 ring-[#2D82FF]/20 transition hover:bg-[#2574ee] active:scale-[0.98] sm:min-h-[52px] sm:px-8 sm:text-base";

export const CTA_SECONDARY_CLASS =
  "inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#0D1B2A] transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-[52px]";

export const MARKETING_HEADING = "font-bold tracking-tight text-[#0D1B2A]";

export const MARKETING_BODY = "text-[15px] leading-relaxed text-[#4D4D4D] sm:text-base";

export const MARKETING_SECTION = "px-4 py-16 sm:px-6 sm:py-20 lg:py-24";

export const MARKETING_CONTAINER = "mx-auto w-full max-w-6xl";
