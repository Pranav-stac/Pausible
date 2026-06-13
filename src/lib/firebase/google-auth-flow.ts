import {
  type Auth,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  type User,
  type UserCredential,
} from "firebase/auth";
import { enrichUserDemographicsFromGoogle } from "@/lib/firebase/user-demographics";

function firebaseAuthErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return "";
}

/** `redirect` = browser is leaving for Google/Firebase; do not navigate or claim until return. */
export type GoogleConnectOutcome = "completed" | "redirect" | "cancelled";

/** Birthday/gender are optional — many Google accounts omit them. Requires People API enabled in GCP. */
export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/user.birthday.read");
  provider.addScope("https://www.googleapis.com/auth/user.gender.read");
  return provider;
}

async function afterGoogleCredential(user: User, credential: UserCredential | null): Promise<void> {
  const accessToken = credential ? GoogleAuthProvider.credentialFromResult(credential)?.accessToken : undefined;
  if (accessToken) await enrichUserDemographicsFromGoogle(user, accessToken);
}

/**
 * Links Google to the current user (anonymous → same uid, Google attached), or signs in with Google
 * when `currentUser` is null. Handles popup block, credential already used, and user-cancelled popups.
 */
export async function connectGoogleAccount(auth: Auth, currentUser: User | null): Promise<GoogleConnectOutcome> {
  const provider = createGoogleAuthProvider();

  const popupLink = () => {
    if (!currentUser) return signInWithPopup(auth, provider);
    return linkWithPopup(currentUser, provider);
  };

  const redirectLink = () => {
    if (!currentUser) return signInWithRedirect(auth, provider);
    return linkWithRedirect(currentUser, provider);
  };

  try {
    const result = await popupLink();
    if (result.user) await afterGoogleCredential(result.user, result);
    return "completed";
  } catch (e: unknown) {
    const code = firebaseAuthErrorCode(e);

    if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
      const credential = GoogleAuthProvider.credentialFromError(
        e as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
      );
      if (credential) {
        const result = await signInWithCredential(auth, credential);
        if (result.user) await afterGoogleCredential(result.user, result);
        return "completed";
      }
      if (!currentUser) throw e;
      try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) await afterGoogleCredential(result.user, result);
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

/** Call after `getRedirectResult` when the user returns from Google sign-in. */
export async function handleGoogleRedirectCredential(credential: UserCredential | null): Promise<void> {
  if (!credential?.user) return;
  await afterGoogleCredential(credential.user, credential);
}
