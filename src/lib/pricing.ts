/** Base assessment price in INR (integer). */
export const DEFAULT_PRICE_INR = Number(process.env.NEXT_PUBLIC_ASSESSMENT_PRICE_INR ?? 499);

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
