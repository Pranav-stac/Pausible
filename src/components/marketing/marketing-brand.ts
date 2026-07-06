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
  "text-[13px] font-bold uppercase tracking-[0.12em] text-[#0284C7]";

/** Primary marketing CTA — brand gradient */
export const CTA_PRIMARY_CLASS =
  "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-[image:var(--marketing-grad)] px-7 py-3.5 text-[17px] font-semibold text-white shadow-[0_14px_30px_-10px_rgba(99,102,241,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-10px_rgba(99,102,241,0.55)] active:scale-[0.98]";

export const CTA_SECONDARY_CLASS =
  "inline-flex min-h-[48px] items-center justify-center rounded-[14px] border border-[#E5E7EB] bg-white/80 px-6 py-3 text-sm font-semibold text-[#111827] backdrop-blur-sm transition hover:border-[#D1D5DB] hover:bg-white active:scale-[0.98] sm:min-h-[52px]";

export const CARD_SURFACE_CLASS =
  "marketing-spotlight rounded-[22px] border border-[#F1F2F4] bg-white p-6 shadow-[0_18px_44px_-30px_rgba(17,24,39,0.2)] transition hover:shadow-[0_24px_60px_-30px_rgba(17,24,39,0.22)]";

export const MARKETING_HEADING = "font-bold tracking-tight text-[#111827]";

export const MARKETING_BODY = "text-lg leading-[1.6] text-[#4B5563]";

export const MARKETING_SECTION = "px-6 py-[104px] sm:px-6";

export const MARKETING_CONTAINER = "mx-auto w-full max-w-[1160px]";

/** App / journey surfaces — same palette as marketing */
export const APP_PAGE_BG = "min-h-screen bg-white scheme-light";

export const APP_PAGE_BG_SOFT = "min-h-screen marketing-section-muted scheme-light";

export const APP_HEADER =
  "sticky top-0 z-40 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl shadow-[0_8px_30px_-20px_rgba(13,27,42,0.08)]";

export const APP_HEADER_INNER =
  "mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6";

export const APP_CONTENT = "mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16";

export const APP_LINK_BACK = "text-sm font-medium text-[#4D4D4D] transition hover:text-[#0D1B2A]";

export const APP_HEADING_LG =
  "text-[2rem] font-bold leading-[1.12] tracking-tight text-[#0D1B2A] sm:text-4xl lg:text-[2.75rem]";

export const APP_HEADING_MD = "text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl";

export const APP_BODY = MARKETING_BODY;

export const APP_MUTED = "text-sm text-[#6E7191]";

export const FORM_CARD_CLASS = CARD_SURFACE_CLASS;

export const INPUT_LABEL = "text-sm font-semibold text-[#0D1B2A]";

export const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-[#0D1B2A] outline-none transition focus:border-[#2D82FF]/40 focus:ring-2 focus:ring-[#2D82FF]/20 disabled:opacity-60";

export const CTA_PRIMARY_FULL_CLASS = `${CTA_PRIMARY_CLASS} w-full`;

export const CTA_SECONDARY_FULL_CLASS = `${CTA_SECONDARY_CLASS} w-full`;

export const PROGRESS_TRACK_CLASS = "h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80";

export const PROGRESS_FILL_CLASS =
  "h-full rounded-full bg-linear-to-r from-[#00C9C8] to-[#2D82FF] transition-all";

export const STEP_BADGE_CLASS =
  "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-[#00C9C8] to-[#2D82FF] text-xs font-bold text-white shadow-[0_4px_12px_-4px_rgba(45,130,255,0.45)]";

export const ACTIVE_CARD_RING =
  "border-[#2D82FF]/40 ring-2 ring-[#2D82FF]/25 ring-offset-2 ring-offset-white";

export const BRAND_ACCENT_TEXT = "text-[#00A8A7]";
