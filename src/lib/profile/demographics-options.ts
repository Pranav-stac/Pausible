/** Canonical age/gender values — aligned with wellness context questionnaire options. */
export const PROFILE_AGE_OPTIONS = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"] as const;
export const PROFILE_GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

export type ProfileAgeRange = (typeof PROFILE_AGE_OPTIONS)[number];
export type ProfileGender = (typeof PROFILE_GENDER_OPTIONS)[number];

export function ageYearsToRange(ageYears: number): ProfileAgeRange {
  if (ageYears < 18) return "Under 18";
  if (ageYears <= 24) return "18–24";
  if (ageYears <= 34) return "25–34";
  if (ageYears <= 44) return "35–44";
  if (ageYears <= 54) return "45–54";
  return "55+";
}

export function mapGoogleGender(value: string | undefined): ProfileGender | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  if (normalized === "other" || normalized === "non-binary" || normalized === "nonbinary") return "Non-binary";
  return undefined;
}
