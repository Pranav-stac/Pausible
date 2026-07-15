/**
 * Load Firestore config through runtime normalize + score once.
 * Usage: npx tsx --env-file=.env scripts/verify-runtime-config.ts
 */
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseRecommendationConfigDoc } from "../src/lib/recommendations/firestore-config-types";
import { scoreAll } from "../src/lib/recommendations/score";
import { selectActionPlan } from "../src/lib/recommendations/select-action-plan";
import type { UserProfile } from "../src/lib/recommendations/types";

function normalizePrivateKey(sa: Record<string, unknown>): void {
  const pk = sa.private_key;
  if (typeof pk === "string" && pk.includes("\\n")) sa.private_key = pk.replace(/\\n/g, "\n");
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
  if (!filePath) throw new Error("Missing Firebase Admin credentials");
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!existsSync(resolved)) throw new Error(`Missing credentials file: ${resolved}`);
  const sa = JSON.parse(readFileSync(resolved, "utf8")) as Record<string, unknown>;
  normalizePrivateKey(sa);
  return sa as ServiceAccount;
}

async function main() {
  if (!getApps().length) initializeApp({ credential: cert(loadServiceAccount()) });
  const snap = await getFirestore().doc("recommendation_config/active").get();
  const config = parseRecommendationConfigDoc(snap.data() as Record<string, unknown>);
  if (!config) throw new Error("parseRecommendationConfigDoc returned null");

  const profile: UserProfile = {
    primaryPersona: "brittle_avoidant",
    secondaryPersona: "self_regulated_planner",
    primaryPersonaAlias: "shielded_turtle",
    secondaryPersonaAlias: "steady_elephant",
    fitTier: "classic",
    blendRatio: 2.5,
    blendStrength: "pure",
    oceanTags: ["C_low", "N_high"],
    goals: ["goal_sleep_recovery", "goal_stress_reduction"],
    barriers: ["barrier_lack_of_consistency", "barrier_lack_of_time"],
    context: ["stress_high", "time_under_30_min", "fitness_beginner", "activity_sedentary"],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: 28,
    isMinor: false,
    isElderly65: false,
  };

  const ranked = scoreAll(config.recommendations, profile);
  const plan = selectActionPlan(ranked, profile);

  console.log(
    JSON.stringify(
      {
        ok: true,
        masterVersion: config.masterVersion,
        recs: config.recommendations.length,
        scoredAboveZero: ranked.filter((r) => r.score.total > 0).length,
        safetyCards: plan.safetyCards.map((c) => c.recId),
        sleepDos: plan.pillarPlans["Sleep & Recovery"].dos.length,
        effortSample: config.recommendations.slice(0, 3).map((r) => ({
          id: r.id,
          effort: r.effortLevel,
          role: r.recommendationRole,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
