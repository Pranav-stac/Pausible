import { buildProfileSafetyContext } from "@/lib/recommendations/profile-safety-context";
import type { PillarName, PillarSynthesisDo, UserProfile } from "@/lib/recommendations/types";

export const PHYSICAL_DISCLAIMER_DEFAULT =
  "Before starting or changing any exercise routine, check with your doctor.";

export const PHYSICAL_DISCLAIMER_PREGNANCY =
  "Before starting or changing any exercise, get clearance from your doctor or OB/GYN.";

export const PHYSICAL_DISCLAIMER_INJURY =
  "Before starting or changing any exercise, check with your doctor or physiotherapist.";

export const NUTRITION_DISCLAIMER =
  "Discuss any changes to how you eat with your healthcare provider.";

export const ELDERLY_ACTIVITY_SUFFIX = "Stop and rest if you feel dizzy, breathless, or in pain.";

/**
 * PDA §38.8 / B10 — Authoritative Disclaimer Register.
 * When multiple Physical Activity triggers are active, insert the highest-priority
 * disclaimer only (do not stack). Nutrition disclaimer is independent.
 */
export const DISCLAIMER_REGISTER = [
  {
    priority: 1,
    id: "pa_pregnancy",
    trigger: "pregnancy_postpartum",
    exactString: PHYSICAL_DISCLAIMER_PREGNANCY,
    pillar: "Physical Activity" as const,
    position: "first_line" as const,
  },
  {
    priority: 2,
    id: "pa_injury",
    trigger: "injury_or_persistent_pain",
    exactString: PHYSICAL_DISCLAIMER_INJURY,
    pillar: "Physical Activity" as const,
    position: "first_line" as const,
  },
  {
    priority: 3,
    id: "pa_medical_or_age",
    trigger: "medical_doctor_advised_or_age_65",
    exactString: PHYSICAL_DISCLAIMER_DEFAULT,
    pillar: "Physical Activity" as const,
    position: "first_line" as const,
  },
  {
    priority: 4,
    id: "nutrition_provider",
    trigger: "medical_doctor_advised_pregnancy_and_nutrition_changes",
    exactString: NUTRITION_DISCLAIMER,
    pillar: "Nutrition" as const,
    position: "first_line" as const,
  },
  {
    priority: 5,
    id: "pa_elderly_suffix",
    trigger: "age_65_plus",
    exactString: ELDERLY_ACTIVITY_SUFFIX,
    pillar: "Physical Activity" as const,
    position: "append_every_item" as const,
  },
] as const;

/** PDA §38.8 — pick exactly one Physical Activity first-line disclaimer by priority. */
export function resolvePhysicalDisclaimer(profile: UserProfile): string | null {
  const safety = buildProfileSafetyContext(profile);
  if (!safety.needsPhysicalDisclaimer) return null;

  if (safety.restrictionFlags.includes("exclude_pregnancy_postpartum")) {
    return PHYSICAL_DISCLAIMER_PREGNANCY;
  }
  if (
    safety.restrictionFlags.includes("exclude_injury") ||
    safety.restrictionFlags.includes("exclude_persistent_pain")
  ) {
    return PHYSICAL_DISCLAIMER_INJURY;
  }
  return PHYSICAL_DISCLAIMER_DEFAULT;
}

function disclaimerAlreadyPresent(text: string, disclaimer: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes(disclaimer.toLowerCase().slice(0, 24)) ||
    lower.includes("check with your doctor") ||
    lower.includes("healthcare provider") ||
    lower.includes("ob/gyn") ||
    lower.includes("physiotherapist")
  );
}

function prependDisclaimerToDos(dos: PillarSynthesisDo[], disclaimer: string): PillarSynthesisDo[] {
  if (dos.some((d) => disclaimerAlreadyPresent(d.action, disclaimer))) return dos;
  return [
    { action: disclaimer, why: "A quick safety check before you begin." },
    ...dos,
  ];
}

function appendElderlySuffix(dos: PillarSynthesisDo[]): PillarSynthesisDo[] {
  return dos.map((d) => {
    if (disclaimerAlreadyPresent(d.action, ELDERLY_ACTIVITY_SUFFIX)) return d;
    if (d.action.length > 180) return d;
    return { ...d, action: `${d.action} ${ELDERLY_ACTIVITY_SUFFIX}` };
  });
}

export type PillarPlanSlice = {
  focusArea: string;
  focusReason: string;
  dos: PillarSynthesisDo[];
  donts: { behavior: string; why: string }[];
  sourceIds: string[];
};

/** PDA v1.2 §38.8 — deterministic disclaimer insertion (no PA stacking). */
export function applySafetyDisclaimersToPillarPlan(
  pillar: PillarName,
  plan: PillarPlanSlice,
  profile: UserProfile,
): PillarPlanSlice {
  let dos = [...plan.dos];
  let focusReason = plan.focusReason;

  if (pillar === "Physical Activity") {
    const disclaimer = resolvePhysicalDisclaimer(profile);
    if (disclaimer) {
      dos = prependDisclaimerToDos(dos, disclaimer);
      if (!disclaimerAlreadyPresent(focusReason, disclaimer)) {
        focusReason = `${disclaimer} ${focusReason}`.trim();
      }
    }
    if (buildProfileSafetyContext(profile).isElderly) {
      dos = appendElderlySuffix(dos);
    }
  }

  if (pillar === "Nutrition" && buildProfileSafetyContext(profile).needsNutritionDisclaimer) {
    if (dos.length > 0 || focusReason.trim()) {
      dos = prependDisclaimerToDos(dos, NUTRITION_DISCLAIMER);
      if (!disclaimerAlreadyPresent(focusReason, NUTRITION_DISCLAIMER)) {
        focusReason = `${NUTRITION_DISCLAIMER} ${focusReason}`.trim();
      }
    }
  }

  return { ...plan, focusReason, dos };
}
