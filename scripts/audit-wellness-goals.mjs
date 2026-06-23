import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const GOALS_KEY = "wc_wellness_goals";
const PROGRESS_KEY = "wc_six_month_progress";
const GOALS_MAX = 2;
const PROGRESS_MAX = 3;

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

const db = initDb();

// Check wellness-context questionnaire in Firestore
const wcSnap = await db.collection("assessments").doc("wellness-context").get();
if (wcSnap.exists) {
  const q = wcSnap.data()?.questions?.wc_wellness_goals;
  console.log("Firestore wellness-context / wc_wellness_goals:");
  console.log("  maxSelections:", q?.maxSelections ?? "(missing — UI allows ALL options!)");
  console.log("  type:", q?.type);
  const p = wcSnap.data()?.questions?.wc_six_month_progress;
  console.log("Firestore wellness-context / wc_six_month_progress:");
  console.log("  maxSelections:", p?.maxSelections ?? "(missing)");
} else {
  console.log("wellness-context assessment doc not in Firestore");
}

console.log("\nScanning attempts for over-limit multi answers...\n");

const snap = await db.collection("attempts").limit(2000).get();
const bad = [];

for (const doc of snap.docs) {
  const answers = doc.data().answers ?? {};
  const goals = answers[GOALS_KEY];
  const progress = answers[PROGRESS_KEY];
  const issues = [];

  if (Array.isArray(goals) && goals.length > GOALS_MAX) {
    issues.push(`goals=${goals.length}`);
  }
  if (Array.isArray(progress) && progress.length > PROGRESS_MAX) {
    issues.push(`six_month=${progress.length}`);
  }
  if (Array.isArray(answers.wc_biggest_barrier)) {
    issues.push("barrier=array");
  }

  if (issues.length) {
    bad.push({ id: doc.id, issues, goals, barrier: answers.wc_biggest_barrier });
  }
}

if (!bad.length) {
  console.log(`No issues in ${snap.size} attempts scanned.`);
} else {
  console.log(`Found ${bad.length} affected attempt(s) out of ${snap.size}:`);
  for (const row of bad) {
    console.log(`  ${row.id}: ${row.issues.join(", ")}`);
    if (Array.isArray(row.goals) && row.goals.length > GOALS_MAX) {
      console.log(`    goals: ${JSON.stringify(row.goals)}`);
    }
  }
}
