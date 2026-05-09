import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore, initializeFirebaseAdmin } from "@/lib/firebase/server";

export type AdminGate = { ok: true; uid: string } | { ok: false; response: NextResponse };

function forbidden(details: Record<string, unknown>) {
  return NextResponse.json({ error: "Forbidden", ...details }, { status: 403 });
}

function serviceMisconfigured(details: Record<string, unknown>) {
  return NextResponse.json({ error: "Service configuration error", ...details }, { status: 503 });
}

/**
 * Verifies Bearer ID token (same Firebase project as Admin SDK) and reads `users/{uid}.role === "admin"` via server SDK.
 */
export async function requireAdmin(req: NextRequest): Promise<AdminGate> {
  const authHeader = req.headers.get("authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : (authHeader ?? "").trim();

  if (!token) {
    return { ok: false, response: forbidden({ reason: "missing_authorization" }) };
  }

  const app = initializeFirebaseAdmin();
  if (!app) {
    return {
      ok: false,
      response: forbidden({
        reason: "server_firebase_admin_unconfigured",
        hint: 'Set FIREBASE_ADMIN_CREDENTIALS_JSON (paste full JSON) or FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64 (base64-encoded file contents, best for Vercel) or FIREBASE_ADMIN_CREDENTIALS_PATH. Must match NEXT_PUBLIC_FIREBASE_PROJECT_ID.',
      }),
    };
  }

  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(token)).uid;
  } catch (e: unknown) {
    const devMsg = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return {
      ok: false,
      response: forbidden({
        reason: "invalid_id_token",
        hint:
          "Token rejected by Firebase Admin — sign out and sign in again, or ensure the Admin service-account project_id equals NEXT_PUBLIC_FIREBASE_PROJECT_ID for this deployment (common after swapping BASE64 credentials: restart dev server if error persists without deploy). After changing FIREBASE_ADMIN_* env, redeploy.",
        ...(devMsg ? { devVerifyMessage: devMsg } : {}),
      }),
    };
  }

  const db = getAdminFirestore();
  if (!db) {
    return {
      ok: false,
      response: forbidden({
        tokenUid: uid,
        reason: "server_firestore_unavailable",
        hint: "Admin app exists but Firestore client is null — check firebase-admin initialization.",
      }),
    };
  }

  let snap;
  try {
    snap = await db.collection("users").doc(uid).get();
  } catch (e) {
    if (isFirebaseAdminUnauthenticatedError(e)) {
      return {
        ok: false,
        response: serviceMisconfigured({
          tokenUid: uid,
          reason: "firebase_admin_firestore_unauthenticated",
          hint: firebaseAdminErrorHint(),
        }),
      };
    }
    throw e;
  }

  if (!snap.exists) {
    return {
      ok: false,
      response: forbidden({
        tokenUid: uid,
        reason: "user_profile_missing",
        hint: `No document at users/${uid} in the project the server is using. Compare tokenUid to your Firestore document ID.`,
      }),
    };
  }

  const role = snap.data()?.role;
  const isAdmin = typeof role === "string" && role.trim() === "admin";
  if (!isAdmin) {
    const preview =
      role === undefined || role === null ? "unset" : typeof role === "string" ? JSON.stringify(role) : typeof role;
    return {
      ok: false,
      response: forbidden({
        tokenUid: uid,
        reason: "role_not_admin",
        hint: `users/${uid}.role must be the string "admin" (server read). Current: ${preview}.`,
      }),
    };
  }

  return { ok: true, uid };
}
