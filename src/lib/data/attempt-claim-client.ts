"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";

/** Legacy same-tab bundle (sessionStorage). Prefer `claimStorageKey`. */
export const SESSION_ATTEMPT_CLAIM_KEY = "pausable_attempt_claim_v1";

export function claimStorageKey(attemptId: string): string {
  return `pausable_claim_${attemptId}`;
}

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

/** Prefer localStorage so results open in a new tab/window can still claim after Google sign-in. */
export function readClaimSecretForAttempt(attemptId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = localStorage.getItem(claimStorageKey(attemptId));
    if (fromLs && fromLs.length >= 16) return fromLs;
  } catch {
    /* private mode */
  }
  const legacy = readStoredAttemptClaim();
  if (legacy?.attemptId === attemptId && legacy.claimSecret.length >= 16) return legacy.claimSecret;
  return null;
}

function clearClaimStorage(attemptId: string): void {
  try {
    localStorage.removeItem(claimStorageKey(attemptId));
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(SESSION_ATTEMPT_CLAIM_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * If this browser has a claim secret for `attemptId`, ask the server to move the attempt
 * from the anonymous uid to the current Firebase user (e.g. after “Sign in with Google”).
 */
export async function tryClaimAttemptForSession(attemptId: string): Promise<boolean> {
  const claimSecret = readClaimSecretForAttempt(attemptId);
  if (!claimSecret) return false;

  for (let i = 0; i < 8; i++) {
    const auth = getFirebaseAuth();
    const u = auth?.currentUser;
    if (u) {
      const idToken = await u.getIdToken();
      const res = await fetch("/api/attempts/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ attemptId, claimSecret }),
      });

      if (!res.ok) return false;

      clearClaimStorage(attemptId);
      return true;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}
