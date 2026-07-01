import type { AttemptAnswers } from "@/types/models";

const OCEAN_PROGRESS_KEY = "pausible_ocean_progress";
const PROFILE_KEY = "pausible_profile";

export const PARTICIPANT_DISPLAY_NAME_KEY = "participant_display_name";

export type OceanProgress = {
  attemptId: string;
  assessmentId: string;
  answers: Record<string, number | string | string[]>;
  revealedCount: number;
  updatedAt: string;
};

export type ProfileDraft = {
  displayName: string;
  ageRange?: string;
  dateOfBirth?: string;
  gender?: string;
};

export function saveOceanProgress(progress: OceanProgress): void {
  try {
    localStorage.setItem(OCEAN_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* quota */
  }
}

export function loadOceanProgress(assessmentId: string): OceanProgress | null {
  try {
    const raw = localStorage.getItem(OCEAN_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OceanProgress;
    if (parsed.assessmentId !== assessmentId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOceanProgress(): void {
  try {
    localStorage.removeItem(OCEAN_PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export function saveProfileDraft(profile: ProfileDraft): void {
  try {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function loadProfileDraft(): ProfileDraft | null {
  try {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ProfileDraft) : null;
  } catch {
    return null;
  }
}

/** Maps profile form fields onto attempt answer keys used by reports and recommendations. */
export function profileDraftToAttemptAnswers(draft: ProfileDraft | null | undefined): AttemptAnswers {
  if (!draft) return {};
  const out: AttemptAnswers = {};
  const name = draft.displayName?.trim();
  if (name && name !== "Your profile") {
    out[PARTICIPANT_DISPLAY_NAME_KEY] = name;
  }
  if (draft.ageRange) out.wc_age_range = draft.ageRange;
  if (draft.gender) out.wc_gender = draft.gender;
  return out;
}

/** Fills missing attempt answers from the profile step without overwriting existing responses. */
export function mergeProfileDraftIntoAnswers(
  answers: AttemptAnswers,
  draft?: ProfileDraft | null,
): AttemptAnswers {
  const fromProfile = profileDraftToAttemptAnswers(draft ?? loadProfileDraft());
  if (!Object.keys(fromProfile).length) return answers;
  const merged = { ...answers };
  for (const [key, val] of Object.entries(fromProfile)) {
    const existing = merged[key];
    if (existing == null || existing === "") merged[key] = val;
  }
  return merged;
}
