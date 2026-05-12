import {
  type Auth,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";

function firebaseAuthErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return "";
}

/** `redirect` = browser is leaving for Google/Firebase; do not navigate or claim until return. */
export type GoogleConnectOutcome = "completed" | "redirect" | "cancelled";

/**
 * Links Google to the current user (anonymous → same uid, Google attached), or signs in with Google
 * when `currentUser` is null. Handles popup block, credential already used, and user-cancelled popups.
 */
export async function connectGoogleAccount(auth: Auth, currentUser: User | null): Promise<GoogleConnectOutcome> {
  const provider = new GoogleAuthProvider();

  const popupLink = () => {
    if (!currentUser) return signInWithPopup(auth, provider);
    return linkWithPopup(currentUser, provider);
  };

  const redirectLink = () => {
    if (!currentUser) return signInWithRedirect(auth, provider);
    return linkWithRedirect(currentUser, provider);
  };

  try {
    await popupLink();
    return "completed";
  } catch (e: unknown) {
    const code = firebaseAuthErrorCode(e);

    if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
      if (!currentUser) throw e;
      try {
        await signInWithPopup(auth, provider);
        return "completed";
      } catch (e2: unknown) {
        const c2 = firebaseAuthErrorCode(e2);
        if (c2 === "auth/popup-blocked") {
          await signInWithRedirect(auth, provider);
          return "redirect";
        }
        throw e2;
      }
    }

    if (code === "auth/provider-already-linked") return "completed";

    if (code === "auth/popup-blocked") {
      await redirectLink();
      return "redirect";
    }

    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "cancelled";

    throw e;
  }
}
