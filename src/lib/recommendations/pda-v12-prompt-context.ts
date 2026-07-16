import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { buildProfileSafetyContext } from "@/lib/recommendations/profile-safety-context";
import { resolveRuntimeShortForms } from "@/lib/recommendations/tag-normalization";
import type { UserProfile } from "@/lib/recommendations/types";
import { PARTICIPANT_DISPLAY_NAME_KEY } from "@/lib/assessment/session-recovery";
import { personaLabel } from "@/lib/results/persona-display";

function pickLifestyle(context: Set<string>): string {
  if (context.has("lifestyle_student")) return "student";
  if (context.has("lifestyle_caregiving")) return "homemaker_caregiver";
  if (context.has("lifestyle_not_working")) return "not_working";
  if (context.has("work_shift_based")) return "shift_based";
  if (context.has("work_physically_demanding")) return "physically_demanding";
  if (context.has("work_travel_heavy")) return "travel_heavy";
  if (context.has("work_desk_based")) return "desk_based";
  return "not specified";
}

function restrictionFlagLabel(tag: string): string {
  const map: Record<string, string> = {
    exclude_medical_condition: "medical",
    exclude_doctor_advised_restriction: "doctor_advised",
    exclude_pregnancy_postpartum: "pregnancy_postpartum",
    exclude_injury: "injury",
    exclude_severe_fatigue: "severe_fatigue",
    exclude_persistent_pain: "persistent_pain",
  };
  return map[tag] ?? tag.replace(/^exclude_/, "");
}

export function resolveFirstName(input?: BuildProfileInput | null): string {
  return resolveFirstNameInternal(input);
}

function resolveFirstNameInternal(input?: BuildProfileInput | null): string {
  const fromInput = input?.participantName?.trim();
  if (fromInput) return fromInput.split(/\s+/)[0] ?? fromInput;
  const fromAnswers = input?.answers?.[PARTICIPANT_DISPLAY_NAME_KEY];
  if (typeof fromAnswers === "string" && fromAnswers.trim()) {
    return fromAnswers.trim().split(/\s+/)[0] ?? fromAnswers.trim();
  }
  return "the user";
}

/** PDA v1.2 §18.1 — user context block appended to the canonical system prompt. */
export function formatPdaUserContextBlock(
  profile: UserProfile,
  input?: BuildProfileInput | null,
  ctx?: GeminiSynthesisContext | null,
): string {
  const contextSet = new Set(profile.context);
  const safety = buildProfileSafetyContext(profile);
  // PDA §10.2 — short forms for system-prompt / selection fields.
  const short = resolveRuntimeShortForms(profile.context);
  const goals =
    ctx?.matchedProfile.goals.map((g) => g.label).join(", ") ||
    profile.goals.map((g) => g.replace(/^goal_/, "").replace(/_/g, " ")).join(", ") ||
    "none";
  const barriers =
    ctx?.matchedProfile.barriers.map((b) => b.label).join(", ") ||
    profile.barriers.map((b) => b.replace(/^barrier_/, "").replace(/_/g, " ")).join(", ") ||
    "none";
  const activityPrefs =
    safety.activityPrefs.map((t) => t.replace(/^activity_pref_/, "").replace(/_/g, " ")).join(", ") ||
    "none";
  const restrictionFlags =
    safety.restrictionFlags.map(restrictionFlagLabel).join(", ") || "none";
  const preferredLocation = [...contextSet]
    .filter((t) => t.startsWith("exercise_location_") || t.startsWith("workout_") || t.startsWith("environment_"))
    .map((t) => t.replace(/^(exercise_location_|workout_|environment_)/, "").replace(/_/g, " "))
    .join(", ");

  return `YOU ALSO RECEIVE THIS USER CONTEXT (use it to obey the rules):
  first_name: ${resolveFirstNameInternal(input)}
  age (years): ${profile.computedAgeYears ?? "not specified"}
  gender: not used in prose unless supplied elsewhere
  lifestyle: ${pickLifestyle(contextSet)}
  fit_tier: ${profile.fitTier}
  primary_persona: ${ctx?.personality.primaryPersona ?? personaLabel(profile.primaryPersona)}
  secondary_persona: ${ctx?.personality.secondaryPersona ?? personaLabel(profile.secondaryPersona)}
  blend_strength: ${profile.blendStrength}
  goals: [${goals}]
  barriers: [${barriers}]
  activity_prefs: [${activityPrefs}]
  preferred_location: ${preferredLocation || "not specified"}
  meal_control: ${short.meal_control ?? "not specified"}
  caffeine: ${short.caffeine ?? "not specified"}
  fitness_level: ${short.fitness_level ?? "not specified"}
  activity_level: ${short.activity_level ?? "not specified"}
  restriction_flags: [${restrictionFlags}]`;
}
