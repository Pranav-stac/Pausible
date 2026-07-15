/**
 * Verify Firestore recommendation_config + centroids after v1.20 seed.
 * Usage: npx tsx --env-file=.env scripts/verify-firestore-seed.ts
 */
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function normalizePrivateKey(sa: Record<string, unknown>): void {
  const pk = sa.private_key;
  if (typeof pk === "string" && pk.includes("\\n")) {
    sa.private_key = pk.replace(/\\n/g, "\n");
  }
}

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64?.replace(/\s+/g, "") ?? "";
  if (b64) {
    const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as Record<string, unknown>;
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
  throw new Error("Missing Firebase Admin credentials");
}

if (!getApps().length) {
  initializeApp({ credential: cert(loadServiceAccount()) });
}

async function main() {
  const db = getFirestore();

  const reco = await db.doc("recommendation_config/active").get();
  if (!reco.exists) {
    console.error("FAIL: recommendation_config/active missing");
    process.exit(1);
  }
  const d = reco.data()!;
  const recs = (d.recommendations ?? []) as Array<{
    id: string;
    effortLevel: unknown;
    scopeClassification?: string;
    recommendationRole?: string;
    userFacingBoundary?: string;
  }>;
  const ids = new Set(recs.map((r) => r.id));
  const required = ["SLP034", "NUT043", "FIT047", "MW040", "NUT046"];
  const missing = required.filter((id) => !ids.has(id));

  const centroids = await db.doc("persona_centroids/default").get();
  const c = centroids.data();
  const elephantN = c?.centroids?.self_regulated_planner?.neuroticism;

  const numericEffort = recs.every(
    (r) => typeof r.effortLevel === "number" && r.effortLevel >= 1 && r.effortLevel <= 5,
  );
  const hasNewCols = recs.every(
    (r) =>
      Boolean(r.scopeClassification) &&
      Boolean(r.recommendationRole) &&
      Boolean(r.userFacingBoundary),
  );

  const ok =
    d.masterVersion === "v1.20" &&
    d.recommendationCount === 201 &&
    recs.length === 201 &&
    d.tagRuleCount === 102 &&
    missing.length === 0 &&
    numericEffort &&
    hasNewCols &&
    elephantN === 1.6;

  console.log(
    JSON.stringify(
      {
        ok,
        masterVersion: d.masterVersion,
        recommendationCount: d.recommendationCount,
        actualRows: recs.length,
        tagRuleCount: d.tagRuleCount,
        missingA7: missing,
        numericEffort,
        hasNewCols,
        sample: {
          id: recs[0]?.id,
          effortLevel: recs[0]?.effortLevel,
          scope: recs[0]?.scopeClassification,
          boundary: recs[0]?.userFacingBoundary,
          role: recs[0]?.recommendationRole,
        },
        elephantN,
      },
      null,
      2,
    ),
  );

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
