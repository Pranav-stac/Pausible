import { scrubBlocklistTerms } from "@/lib/recommendations/content-blocklist";
import { buildProfileSafetyContext } from "@/lib/recommendations/profile-safety-context";
import type { UserProfile } from "@/lib/recommendations/types";

/** PDA §38.2 DR25 — swap workplace language for non-workers. */
const WORK_LANGUAGE_REPLACEMENTS: [RegExp, string][] = [
  [/\bafter your last work task\b/gi, "after your main activities for the day"],
  [/\bafter work\b/gi, "after your day"],
  [/\bbefore work\b/gi, "before your day"],
  [/\bworkday\b/gi, "day"],
  [/\bwork day\b/gi, "day"],
  [/\bwork self\b/gi, "busy self"],
  [/\bwork bleeds\b/gi, "your day bleeds"],
  [/\bwork messages\b/gi, "messages"],
  [/\bwork screens\b/gi, "screens"],
  [/\bwork schedule\b/gi, "daily schedule"],
  [/\bat work\b/gi, "during your day"],
  [/\bwork\b/gi, "daily routine"],
  [/\boffice\b/gi, "daily routine"],
  [/\bmeeting\b/gi, "appointment"],
  [/\bcommute\b/gi, "travel"],
  [/\bdesk-based\b/gi, "seated"],
  [/\bcolleagues\b/gi, "people around you"],
  [/\bcoworkers\b/gi, "people around you"],
];

/** Soften fixed time-of-day assumptions for shift workers (platform extension). */
const SHIFT_TIME_REPLACEMENTS: [RegExp, string][] = [
  [/\bmorning walk\b/gi, "walk when you are most rested"],
  [/\bevening wind-down\b/gi, "wind-down before sleep"],
  [/\bat bedtime\b/gi, "before your sleep window"],
  [/\bfirst thing in the morning\b/gi, "when you wake from your main sleep"],
];

export function applyLifestyleFraming(text: string, profile: UserProfile): string {
  let out = scrubBlocklistTerms(text);
  const safety = buildProfileSafetyContext(profile);

  if (safety.isNonWorker) {
    for (const [pattern, replacement] of WORK_LANGUAGE_REPLACEMENTS) {
      out = out.replace(pattern, replacement);
    }
  }

  if (safety.isShiftWorker) {
    for (const [pattern, replacement] of SHIFT_TIME_REPLACEMENTS) {
      out = out.replace(pattern, replacement);
    }
  }

  // PDA §38.2 DR26 — skill-learning framing (CQ08 activity_cat_skill_learning).
  if (profile.context.includes("activity_cat_skill_learning")) {
    out = out
      .replace(/\bworkout session\b/gi, "practice session")
      .replace(/\bworkout\b/gi, "skill practice")
      .replace(/\bconsistency streak\b/gi, "mastery streak");
  }

  return out.replace(/\s{2,}/g, " ").trim();
}
