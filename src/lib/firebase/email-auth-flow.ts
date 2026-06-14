import {
  type Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";

function firebaseAuthErrorCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return "";
}

function friendlyEmailAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Could not sign in. Please check your details and try again.";
  }
}

export async function signInWithEmailPassword(auth: Auth, email: string, password: string): Promise<User> {
  const trimmed = email.trim();
  try {
    const cred = await signInWithEmailAndPassword(auth, trimmed, password);
    return cred.user;
  } catch (err: unknown) {
    throw new Error(friendlyEmailAuthError(firebaseAuthErrorCode(err)));
  }
}

export async function registerWithEmailPassword(auth: Auth, email: string, password: string): Promise<User> {
  const trimmed = email.trim();
  try {
    const cred = await createUserWithEmailAndPassword(auth, trimmed, password);
    return cred.user;
  } catch (err: unknown) {
    throw new Error(friendlyEmailAuthError(firebaseAuthErrorCode(err)));
  }
}
