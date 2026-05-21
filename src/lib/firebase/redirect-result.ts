import { getRedirectResult, type Auth, type UserCredential } from "firebase/auth";

/** Firebase redirect results are single-use; guard against duplicate calls (e.g. React remounts). */
let redirectResultPromise: Promise<UserCredential | null> | null = null;

export function consumeGoogleRedirectResult(auth: Auth): Promise<UserCredential | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch(() => null);
  }
  return redirectResultPromise;
}
