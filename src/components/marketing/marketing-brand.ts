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

export const GRADIENT_BG =
  "bg-linear-to-r from-[#00C9C8] to-[#2D82FF]";

export const GRADIENT_BG_HOVER =
  "hover:from-[#00b8b7] hover:to-[#2574ee]";

export const GRADIENT_CTA_BG =
  "bg-linear-to-br from-[#00C9C8] via-[#1aabdf] to-[#2D82FF]";

export const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.28em] text-[#00C9C8] sm:text-xs";
