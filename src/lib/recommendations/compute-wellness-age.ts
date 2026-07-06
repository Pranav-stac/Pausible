import type { AttemptAnswers } from "@/types/models";

const DOB_KEY = "wc_date_of_birth";

/** Age-band tag → approximate years (midpoint; 55+ uses 62 so band alone does not trigger 65+ rules). */
const BAND_APPROX_AGE: Record<string, number> = {
  age_under_18: 16,
  age_18_24: 21,
  age_25_34: 30,
  age_35_44: 40,
  age_45_54: 50,
  age_55_plus: 62,
};

export function parseIsoDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeAgeYearsFromDate(dob: Date, now = new Date()): number {
  const y = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  const day = now.getUTCDate() - dob.getUTCDate();
  return m < 0 || (m === 0 && day < 0) ? y - 1 : y;
}

export function ageBandTagFromYears(years: number): string {
  if (years < 18) return "age_under_18";
  if (years < 25) return "age_18_24";
  if (years < 35) return "age_25_34";
  if (years < 45) return "age_35_44";
  if (years < 55) return "age_45_54";
  return "age_55_plus";
}

export type WellnessAgeInfo = {
  computedAgeYears: number | null;
  isMinor: boolean;
  isElderly65: boolean;
};

/** CQ01 — prefer exact DOB; fall back to age-band midpoint. */
export function resolveWellnessAge(answers: AttemptAnswers, contextTags: string[]): WellnessAgeInfo {
  const dobRaw = answers[DOB_KEY];
  if (typeof dobRaw === "string" && dobRaw.trim()) {
    const dob = parseIsoDate(dobRaw);
    if (dob) {
      const years = computeAgeYearsFromDate(dob);
      return {
        computedAgeYears: years,
        isMinor: years < 18,
        isElderly65: years >= 65,
      };
    }
  }

  for (const band of Object.keys(BAND_APPROX_AGE)) {
    if (contextTags.includes(band)) {
      const years = BAND_APPROX_AGE[band]!;
      return {
        computedAgeYears: years,
        isMinor: band === "age_under_18",
        isElderly65: years >= 65,
      };
    }
  }

  return { computedAgeYears: null, isMinor: false, isElderly65: false };
}

export const WELLNESS_DATE_OF_BIRTH_KEY = DOB_KEY;
