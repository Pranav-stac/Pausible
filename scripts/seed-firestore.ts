/**
 * One-shot Firestore seed (no admin session required).
 * Requires Firebase Admin credentials in .env — same as the Next.js server.
 *
 * Usage: npm run seed:firestore
 */
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildOceanPersonalityAssessment } from "../src/data/ocean-personality-assessment";
import { buildWellnessContextQuestionnaire, wellnessContextAssessmentId } from "../src/data/wellness-context-questionnaire";
import { DEFAULT_PERSONA_ALPHA, DEFAULT_PERSONA_CENTROIDS } from "../src/lib/scoring/persona-defaults";
import { exportOceanTagConfigForStorage } from "../src/lib/scoring/ocean-tags";
import { buildRecommendationSeedPayload } from "../src/lib/recommendations/build-seed-payload";
import { RECOMMENDATION_CONFIG_DOC_PATH } from "../src/lib/recommendations/firestore-config-types";

const OCEAN_TAG_CONFIG_DOC = "ocean_tag_config/active";
const CENTROIDS_DOC = "persona_centroids/default";

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64?.replace(/\s+/g, "") ?? "";
  if (b64) {
    const raw = Buffer.from(b64, "base64").toString("utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw) as ServiceAccount;
  }

  const rawJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  if (rawJson) {
    const sa = JSON.parse(rawJson.replace(/^\uFEFF/, "")) as ServiceAccount;
    if (typeof sa.private_key === "string" && sa.private_key.includes("\\n")) {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }
    return sa;
  }

  const filePath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH?.trim();
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (existsSync(resolved)) {
      const sa = JSON.parse(readFileSync(resolved, "utf8").replace(/^\uFEFF/, "")) as ServiceAccount;
      if (typeof sa.private_key === "string" && sa.private_key.includes("\\n")) {
        sa.private_key = sa.private_key.replace(/\\n/g, "\n");
      }
      return sa;
    }
  }

  throw new Error(
    "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_CREDENTIALS_JSON, _BASE64, or _PATH in .env",
  );
}

function initDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  return getFirestore();
}

async function seedRecommendations(db: Firestore) {
  const payload = buildRecommendationSeedPayload();
  await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).set(
    {
      ...payload,
      recommendationCount: payload.recommendations.length,
      tagRuleCount: payload.tagMappingRules.length,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  console.log(`✓ ${RECOMMENDATION_CONFIG_DOC_PATH} — ${payload.recommendations.length} recommendations`);
}

async function seedAssessment(
  db: Firestore,
  id: string,
  def: ReturnType<typeof buildOceanPersonalityAssessment>,
) {
  const ref = db.collection("assessments").doc(id);
  const exists = (await ref.get()).exists;
  await ref.set(
    {
      ...def,
      id,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  const qCount = Object.keys(def.questions).length;
  console.log(`✓ assessments/${id} — ${qCount} questions`);
}

async function seedOceanTags(db: Firestore) {
  const payload = exportOceanTagConfigForStorage();
  await db.doc(OCEAN_TAG_CONFIG_DOC).set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  console.log(
    `✓ ${OCEAN_TAG_CONFIG_DOC} — ${payload.traitTags.length} trait bands, ${payload.categoryTags.length} category bands`,
  );
}

async function seedPersonaCentroids(db: Firestore) {
  await db.doc(CENTROIDS_DOC).set(
    {
      centroids: DEFAULT_PERSONA_CENTROIDS,
      alpha: DEFAULT_PERSONA_ALPHA,
      version: "v5",
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );
  console.log(`✓ ${CENTROIDS_DOC} — v5 centroids`);
}

async function verify(db: Firestore) {
  const reco = await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).get();
  if (!reco.exists) throw new Error("Verification failed: recommendation config missing");
  const d = reco.data()!;
  console.log(
    `\nVerified recommendation_config: ${d.recommendationCount} rows, wellnessFields=${Array.isArray(d.wellnessFields) ? d.wellnessFields.length : 0}`,
  );
}

async function main() {
  console.log("Pausible Firestore seed\n");

  const db = initDb();

  await seedRecommendations(db);
  await seedAssessment(db, "default", buildOceanPersonalityAssessment());
  await seedAssessment(db, wellnessContextAssessmentId, buildWellnessContextQuestionnaire());
  await seedOceanTags(db);
  await seedPersonaCentroids(db);

  await verify(db);

  console.log("\nDone. Restart dev server and complete a new assessment attempt.");
}

main().catch((e) => {
  console.error("\nSeed failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
