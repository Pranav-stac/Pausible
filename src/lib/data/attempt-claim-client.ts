"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

/** Same-tab session bundle written when an assessment run starts (see AssessmentRunner). */
export const SESSION_ATTEMPT_CLAIM_KEY = "pausable_attempt_claim_v1";

export type StoredAttemptClaim = {
  attemptId: string;
  claimSecret: string;
};

export function readStoredAttemptClaim(): StoredAttemptClaim | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_ATTEMPT_CLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttemptClaim;
    if (!parsed?.attemptId || !parsed?.claimSecret) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * If this browser has a claim secret for `attemptId`, ask the server to move the attempt
 * from the anonymous uid to the current Firebase user (e.g. after “Sign in with Google”).
 */
export async function tryClaimAttemptForSession(attemptId: string): Promise<boolean> {
  const stored = readStoredAttemptClaim();
  if (!stored || stored.attemptId !== attemptId) return false;

  const auth = getFirebaseAuth();
  const u = auth?.currentUser;
  if (!u) return false;

  const idToken = await u.getIdToken();
  const res = await fetch("/api/attempts/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ attemptId, claimSecret: stored.claimSecret }),
  });

  if (!res.ok) return false;

  try {
    sessionStorage.removeItem(SESSION_ATTEMPT_CLAIM_KEY);
  } catch {
    /* ignore */
  }
  return true;
}
