/**
 * Firebase Admin (Firestore + Auth REST) often surfaces invalid or revoked
 * service-account keys as gRPC status 16 UNAUTHENTICATED — unrelated to browser sign-in.
 */
export function isFirebaseAdminUnauthenticatedError(err: unknown): boolean {
  const any = err as { code?: number; message?: string; details?: string };
  const blob = `${any?.message ?? ""} ${any?.details ?? ""} ${String(any?.code ?? "")} ${String(err)}`;
  return (
    any?.code === 16 ||
    /UNAUTHENTICATED/i.test(blob) ||
    /invalid authentication credential/i.test(blob) ||
    /Expected OAuth 2 access token/i.test(blob)
  );
}

export function firebaseAdminErrorHint(): string {
  return "Server env must include valid FIREBASE_ADMIN_CREDENTIALS_JSON (or PATH) for the same Firebase project as the app. On Vercel, paste the full service-account JSON (regenerate the key if revoked).";
}
