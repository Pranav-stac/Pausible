/** Default assessment price in INR from env — used when Firestore does not override. */
export const DEFAULT_PRICE_INR = Number(process.env.NEXT_PUBLIC_ASSESSMENT_PRICE_INR ?? 499);

const MIN_PRICE_INR = 1;
const MAX_PRICE_INR = 500_000;

/** Resolve list price from `app_settings/global.priceInr` or env default if missing/invalid. */
export function effectiveAssessmentPriceInr(storedPrice: unknown): number {
  const fallback =
    Number.isFinite(DEFAULT_PRICE_INR) && DEFAULT_PRICE_INR >= MIN_PRICE_INR && DEFAULT_PRICE_INR <= MAX_PRICE_INR
      ? Math.round(DEFAULT_PRICE_INR)
      : 499;
  if (typeof storedPrice !== "number" || !Number.isFinite(storedPrice)) return fallback;
  const n = Math.round(storedPrice);
  if (n < MIN_PRICE_INR || n > MAX_PRICE_INR) return fallback;
  return n;
}

export function priceAfterDiscount(priceInr: number, percentOff: number) {
  const clamped = Math.min(90, Math.max(0, percentOff));
  return Math.max(0, Math.round(priceInr * (1 - clamped / 100)));
}

/** Dev / seeded campaigns — replace with Firestore `discount_campaigns` in production */
export function lookupDiscountPercent(code: string | null | undefined): number {
  if (!code) return 0;
  const normalized = code.trim().toUpperCase();
  const map: Record<string, number> = {
    WELCOME20: 20,
    FRIEND15: 15,
  };
  return map[normalized] ?? 0;
}

export function formatInr(amount: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}
