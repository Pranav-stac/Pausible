import * as firebaseAdminApp from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadCredentialsRaw(): string | null {
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH?.trim();
  if (filePath) {
    try {
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.join(/* turbopackIgnore: true */ process.cwd(), filePath);
      if (existsSync(resolved)) {
        return readFileSync(resolved, "utf8").replace(/^\uFEFF/, "");
      }
    } catch {
      /* fall through to JSON env */
    }
  }

  /** Safer on Vercel than pasting raw JSON (no quote/newline mangling, no 4k-ish paste issues). */
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64?.trim();
  if (b64) {
    try {
      return Buffer.from(b64, "base64").toString("utf8").replace(/^\uFEFF/, "");
    } catch {
      return null;
    }
  }

  const rawJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  if (!rawJson) return null;
  return rawJson.replace(/^\uFEFF/, "");
}

/** PEM in env copy-paste sometimes keeps literal `\n` pairs instead of real newlines after JSON.parse. */
function normalizePrivateKey(sa: Record<string, unknown>): void {
  const pk = sa.private_key;
  if (typeof pk !== "string") return;
  if (pk.includes("\\n")) {
    sa.private_key = pk.replace(/\\n/g, "\n");
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  return getFirestore(app);
}

export function getAdminAuth(): Auth | null {
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  return getAuth(app);
}

export function firebaseAdminCredentialsJson(): string | null {
  return loadCredentialsRaw();
}

/** Returns Firebase Admin App or null when credentials absent/invalid */
export function initializeFirebaseAdmin() {
  const apps = firebaseAdminApp.getApps();
  if (apps.length) return apps[0]!;

  const json = loadCredentialsRaw();
  if (!json?.trim()) return null;

  try {
    const sa = JSON.parse(json) as Record<string, unknown>;
    normalizePrivateKey(sa);
    return firebaseAdminApp.initializeApp({
      credential: firebaseAdminApp.cert(sa as firebaseAdminApp.ServiceAccount),
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[firebase-admin] Invalid FIREBASE_ADMIN_CREDENTIALS_JSON (or unreadable FIREBASE_ADMIN_CREDENTIALS_PATH).",
        e,
      );
    }
    return null;
  }
}
