/**
 * Full Firestore backup to timestamped JSON files.
 *
 * Usage:
 *   npm run backup:firestore
 *   npm run backup:firestore -- --out ./my-backup
 */
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore, type DocumentData } from "firebase-admin/firestore";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const COLLECTIONS = ["attempts", "assessments", "users", "share_snapshots", "site_events"] as const;

const SINGLETON_DOCS = [
  "recommendation_config/active",
  "ocean_tag_config/active",
  "persona_centroids/default",
  "scoring_config/active",
  "persona_catalog/active",
  "report_templates/active",
  "app_settings/global",
] as const;

function normalizePrivateKey(sa: Record<string, unknown>): void {
  const pk = sa.private_key;
  if (typeof pk === "string" && pk.includes("\\n")) {
    sa.private_key = pk.replace(/\\n/g, "\n");
  }
}

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64?.replace(/\s+/g, "") ?? "";
  if (b64) {
    const raw = Buffer.from(b64, "base64").toString("utf8").replace(/^\uFEFF/, "");
    const sa = JSON.parse(raw) as Record<string, unknown>;
    normalizePrivateKey(sa);
    return sa as ServiceAccount;
  }
  const rawJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  if (rawJson) {
    const sa = JSON.parse(rawJson) as Record<string, unknown>;
    normalizePrivateKey(sa);
    return sa as ServiceAccount;
  }
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH?.trim();
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (existsSync(resolved)) {
      const sa = JSON.parse(readFileSync(resolved, "utf8")) as Record<string, unknown>;
      normalizePrivateKey(sa);
      return sa as ServiceAccount;
    }
  }
  throw new Error("Missing Firebase Admin credentials in .env");
}

function initDb(): Firestore {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  return getFirestore();
}

function serializeValue(v: unknown): unknown {
  if (v == null) return v;
  if (Array.isArray(v)) return v.map(serializeValue);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.toDate === "function") {
      try {
        return { __type: "Timestamp", iso: (o.toDate as () => Date)().toISOString() };
      } catch {
        return null;
      }
    }
    if (typeof o.toMillis === "function") {
      try {
        return { __type: "Timestamp", iso: new Date((o.toMillis as () => number)()).toISOString() };
      } catch {
        return null;
      }
    }
    if (o._latitude != null && o._longitude != null) {
      return { __type: "GeoPoint", latitude: o._latitude, longitude: o._longitude };
    }
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      out[k] = serializeValue(val);
    }
    return out;
  }
  return v;
}

function serializeDoc(data: DocumentData): Record<string, unknown> {
  return serializeValue(data) as Record<string, unknown>;
}

async function backupCollection(db: Firestore, name: string) {
  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  const pageSize = 500;

  while (true) {
    let q = db.collection(name).orderBy("__name__").limit(pageSize);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      docs.push({ id: doc.id, data: serializeDoc(doc.data()) });
    }
    last = snap.docs[snap.docs.length - 1]!;
    if (snap.size < pageSize) break;
  }

  return { collection: name, count: docs.length, docs };
}

async function backupSingleton(db: Firestore, docPath: string) {
  const snap = await db.doc(docPath).get();
  return {
    path: docPath,
    exists: snap.exists,
    data: snap.exists ? serializeDoc(snap.data()!) : null,
  };
}

function parseOutDir(): string {
  const idx = process.argv.indexOf("--out");
  if (idx >= 0 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]!);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(process.cwd(), "backups", `firestore-${stamp}`);
}

async function main() {
  const outDir = parseOutDir();
  mkdirSync(outDir, { recursive: true });

  console.log(`Pausible Firestore backup → ${outDir}\n`);
  const db = initDb();

  const manifest: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
    collections: {},
    singletons: {},
  };

  for (const name of COLLECTIONS) {
    process.stdout.write(`Backing up ${name}...`);
    const payload = await backupCollection(db, name);
    const file = path.join(outDir, `${name}.json`);
    writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");
    (manifest.collections as Record<string, number>)[name] = payload.count;
    console.log(` ${payload.count} docs`);
  }

  const singletons: Record<string, unknown> = {};
  for (const docPath of SINGLETON_DOCS) {
    process.stdout.write(`Backing up ${docPath}...`);
    const payload = await backupSingleton(db, docPath);
    const safeName = docPath.replace(/\//g, "__");
    writeFileSync(path.join(outDir, `${safeName}.json`), JSON.stringify(payload, null, 2), "utf8");
    singletons[docPath] = payload.exists;
    console.log(payload.exists ? " ok" : " (missing)");
  }
  manifest.singletons = singletons;

  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nBackup complete. Manifest: ${path.join(outDir, "manifest.json")}`);
}

main().catch((e) => {
  console.error("\nBackup failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
