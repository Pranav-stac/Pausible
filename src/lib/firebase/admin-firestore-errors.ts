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
  return (
    "Server env must include valid FIREBASE_ADMIN_CREDENTIALS_JSON (same project as NEXT_PUBLIC_FIREBASE_*), " +
    "or FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64 (recommended on Vercel: base64 the full downloaded service-account .json file), " +
    "or FIREBASE_ADMIN_CREDENTIALS_PATH. Paste errors often truncate or break private_key — regenerate if revoked or leaked."
  );
}
