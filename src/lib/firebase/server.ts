import * as firebaseAdminApp from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Credential load order: explicit BASE64 → explicit JSON env → filesystem PATH.
 * (PATH last so `FIREBASE_ADMIN_CREDENTIALS_PATH` pointing at repo/stale files never overrides Vercel secrets.)
 */
function loadCredentialsRaw(): string | null {
  const b64Compact = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64?.replace(/\s+/g, "") ?? "";
  if (b64Compact) {
    try {
      const raw = Buffer.from(b64Compact, "base64").toString("utf8").replace(/^\uFEFF/, "");
      if (raw.includes('"type"') && raw.includes("service_account")) return raw;
    } catch {
      /* fall through */
    }
  }

  const rawJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  if (rawJson) return rawJson.replace(/^\uFEFF/, "");

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
      /* no file */
    }
  }

  return null;
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

function adminAppName(jsonTrimmed: string): string {
  const suffix = createHash("sha256").update(jsonTrimmed).digest("hex").slice(0, 32);
  return `pausable-admin-${suffix}`;
}

function duplicateAdminApp(error: unknown): boolean {
  const any = error as { code?: string; message?: string };
  const m = `${any?.code ?? ""} ${any?.message ?? ""}`;
  return any?.code === "app/duplicate-app" || /\balready exists\b/i.test(m);
}

export function firebaseAdminCredentialsJson(): string | null {
  return loadCredentialsRaw();
}

export function initializeFirebaseAdmin() {
  const jsonRaw = loadCredentialsRaw();
  if (!jsonRaw?.trim()) return null;

  const jsonTrimmed = jsonRaw.trim();

  let sa: Record<string, unknown>;
  try {
    sa = JSON.parse(jsonTrimmed) as Record<string, unknown>;
    normalizePrivateKey(sa);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[firebase-admin] Invalid FIREBASE_ADMIN credential JSON / BASE64 / path (parse failed).",
        e,
      );
    }
    return null;
  }

  const name = adminAppName(jsonTrimmed);

  try {
    return firebaseAdminApp.getApp(name);
  } catch {
    /* must initialize below */
  }

  const projectId = typeof sa.project_id === "string" ? sa.project_id : undefined;

  try {
    return firebaseAdminApp.initializeApp(
      {
        credential: firebaseAdminApp.cert(sa as firebaseAdminApp.ServiceAccount),
        ...(projectId ? { projectId } : {}),
      },
      name,
    );
  } catch (e) {
    if (duplicateAdminApp(e)) return firebaseAdminApp.getApp(name);
    if (process.env.NODE_ENV === "development") {
      console.error("[firebase-admin] initializeApp failed.", e);
    }
    return null;
  }
}
