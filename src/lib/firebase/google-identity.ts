import type { User } from "firebase/auth";

/** True when the Firebase user is non-anonymous and signed in with Google (email or provider id). */
export function userHasGoogleIdentity(user: User | null): boolean {
  if (!user || user.isAnonymous) return false;
  if (user.email) return true;
  return user.providerData.some((p) => p.providerId === "google.com");
}
