/**
 * Wipe Firestore config + attempt data for a clean PDA v1.0 rebuild.
 * Requires Firebase Admin credentials in .env.
 *
 * Usage: npm run wipe:firestore
 *        npm run wipe:firestore -- --keep-attempts  (config only)
 */
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const BATCH_SIZE = 400;

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

async function deleteCollection(db: Firestore, name: string): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await db.collection(name).limit(BATCH_SIZE).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    total += snap.size;
    process.stdout.write(`  ${name}: deleted ${total}...\r`);
  }
  if (total > 0) console.log(`  ${name}: deleted ${total} documents`);
  else console.log(`  ${name}: (empty)`);
  return total;
}

async function deleteDoc(db: Firestore, path: string): Promise<void> {
  const ref = db.doc(path);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.delete();
    console.log(`  ${path}: deleted`);
  } else {
    console.log(`  ${path}: (missing)`);
  }
}

async function main() {
  const keepAttempts = process.argv.includes("--keep-attempts");
  console.log("Pausible Firestore wipe\n");

  const db = initDb();

  console.log("Deleting singleton config docs...");
  await deleteDoc(db, "recommendation_config/active");
  await deleteDoc(db, "ocean_tag_config/active");
  await deleteDoc(db, "persona_centroids/default");

  console.log("\nDeleting collections...");
  await deleteCollection(db, "assessments");

  if (!keepAttempts) {
    await deleteCollection(db, "attempts");
    await deleteCollection(db, "share_snapshots");
    console.log("\nNote: users and site_events were NOT deleted.");
  } else {
    console.log("\n--keep-attempts: skipped attempts + share_snapshots");
  }

  console.log("\nWipe complete. Run: npm run seed:firestore");
}

main().catch((e) => {
  console.error("\nWipe failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
