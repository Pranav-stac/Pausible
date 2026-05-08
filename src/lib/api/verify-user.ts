import { initializeFirebaseAdmin } from "@/lib/firebase/server";
import { getAuth } from "firebase-admin/auth";

export async function verifyIdToken(authHeader: string | null): Promise<{ uid: string; admin?: boolean } | null> {
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : (authHeader ?? "").trim();

  const app = initializeFirebaseAdmin();
  if (!app || !token) return null;

  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    const claimAdmin = decoded.admin === true;
    return { uid: decoded.uid, admin: claimAdmin };
  } catch {
    return null;
  }
}
