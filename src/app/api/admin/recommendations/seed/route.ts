import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { buildRecommendationSeedPayload } from "@/lib/recommendations/build-seed-payload";
import { RECOMMENDATION_CONFIG_DOC_PATH } from "@/lib/recommendations/firestore-config-types";
import { clearRecommendationConfigCache } from "@/lib/recommendations/load-recommendation-config";
import { getAdminFirestore } from "@/lib/firebase/server";

/** Upload structured recommendation master + tag mapping to Firestore (no runtime CSV). */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });
  }

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

  clearRecommendationConfigCache();

  return NextResponse.json({
    ok: true,
    path: RECOMMENDATION_CONFIG_DOC_PATH,
    recommendationCount: payload.recommendations.length,
    tagRuleCount: payload.tagMappingRules.length,
    wellnessFieldCount: payload.wellnessFields.length,
    version: payload.version,
    masterVersion: payload.masterVersion,
  });
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });
  }

  const snap = await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).get();
  if (!snap.exists) {
    return NextResponse.json({ seeded: false, path: RECOMMENDATION_CONFIG_DOC_PATH });
  }

  const d = snap.data() ?? {};
  return NextResponse.json({
    seeded: true,
    path: RECOMMENDATION_CONFIG_DOC_PATH,
    version: d.version,
    masterVersion: d.masterVersion,
    recommendationCount: d.recommendationCount,
    tagRuleCount: d.tagRuleCount,
    wellnessFieldCount: Array.isArray(d.wellnessFields) ? d.wellnessFields.length : 0,
  });
}
