import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ATTEMPT_ID = args[0] ?? "";
const FIX_ALL = process.argv.includes("--all");
const DRY_RUN = process.argv.includes("--dry-run");

const LIMITS = {
  wc_wellness_goals: 2,
  wc_six_month_progress: 3,
};

function loadCredentials() {
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH?.trim();
  if (!filePath) throw new Error("FIREBASE_ADMIN_CREDENTIALS_PATH missing");
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  if (!existsSync(resolved)) throw new Error(`Credentials not found: ${resolved}`);
  const sa = JSON.parse(readFileSync(resolved, "utf8"));
  if (typeof sa.private_key === "string" && sa.private_key.includes("\\n")) {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }
  return sa;
}

function initDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadCredentials()) });
  }
  return getFirestore();
}

function trimMulti(answers, key, max) {
  const raw = answers[key];
  if (!Array.isArray(raw)) return { changed: false, value: raw };
  const cleaned = raw.map(String).filter(Boolean);
  if (cleaned.length <= max) return { changed: false, value: cleaned };
  return { changed: true, value: cleaned.slice(0, max), dropped: cleaned.slice(max) };
}

function fixAnswers(answers) {
  const next = { ...answers };
  const patch = {};
  let changed = false;

  for (const [key, max] of Object.entries(LIMITS)) {
    const trimmed = trimMulti(next, key, max);
    if (trimmed.changed) {
      next[key] = trimmed.value;
      patch[`answers.${key}`] = trimmed.value;
      changed = true;
      console.log(`  ${key}: ${trimmed.value.length} kept, dropped:`, trimmed.dropped);
    }
  }

  const barrierRaw = next.wc_biggest_barrier;
  if (Array.isArray(barrierRaw)) {
    const first = barrierRaw.map(String).filter(Boolean)[0];
    if (first) {
      next.wc_biggest_barrier = first;
      patch["answers.wc_biggest_barrier"] = first;
      changed = true;
      console.log("  wc_biggest_barrier: array ->", first);
    }
  }

  return { next, patch, changed };
}

async function fixOne(db, id) {
  const ref = db.collection("attempts").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error("Attempt not found:", id);
    return false;
  }

  const data = snap.data();
  const answers = { ...(data.answers ?? {}) };
  console.log(`\n${id}`);
  console.log("  before goals:", answers.wc_wellness_goals);
  console.log("  before six_month:", answers.wc_six_month_progress);

  const { patch, changed } = fixAnswers(answers);
  if (!changed) {
    console.log("  ok — no changes");
    return false;
  }

  if (DRY_RUN) {
    console.log("  dry-run patch:", patch);
    return true;
  }

  patch.actionPlanCache = FieldValue.delete();
  await ref.update(patch);
  console.log("  updated, actionPlanCache cleared");
  return true;
}

const db = initDb();

if (FIX_ALL) {
  const snap = await db.collection("attempts").limit(2000).get();
  let fixed = 0;
  for (const doc of snap.docs) {
    const answers = doc.data().answers ?? {};
    const needsGoals = Array.isArray(answers.wc_wellness_goals) && answers.wc_wellness_goals.length > LIMITS.wc_wellness_goals;
    const needsProgress =
      Array.isArray(answers.wc_six_month_progress) && answers.wc_six_month_progress.length > LIMITS.wc_six_month_progress;
    const needsBarrier = Array.isArray(answers.wc_biggest_barrier);
    if (needsGoals || needsProgress || needsBarrier) {
      if (await fixOne(db, doc.id)) fixed += 1;
    }
  }
  console.log(`\n${DRY_RUN ? "Would fix" : "Fixed"} ${fixed} attempt(s).`);
  process.exit(0);
}

if (!ATTEMPT_ID || ATTEMPT_ID.startsWith("--")) {
  console.error("Usage: node scripts/fix-attempt-goals.mjs <attemptId> [--dry-run] | --all [--dry-run]");
  process.exit(1);
}

await fixOne(db, ATTEMPT_ID);
