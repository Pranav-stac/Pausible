import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { buildRecommendationSeedPayload } from "@/lib/recommendations/build-seed-payload";
import {
  parseRecommendationConfigDoc,
  RECOMMENDATION_CONFIG_DOC_PATH,
  type RecommendationConfig,
} from "@/lib/recommendations/firestore-config-types";
import { clearRecommendationConfigCache } from "@/lib/recommendations/load-recommendation-config";
import { getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

  const snap = await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).get();
  if (!snap.exists) {
    const defaults = buildRecommendationSeedPayload();
    return NextResponse.json({ seeded: false, config: defaults, defaults });
  }

  const parsed = parseRecommendationConfigDoc(snap.data() as Record<string, unknown>);
  const d = snap.data() ?? {};
  return NextResponse.json({
    seeded: true,
    config: parsed,
    meta: {
      recommendationCount: d.recommendationCount,
      tagRuleCount: d.tagRuleCount,
      updatedAt: d.updatedAt,
    },
    defaults: buildRecommendationSeedPayload(),
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

  const body = (await req.json().catch(() => null)) as Partial<RecommendationConfig> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const snap = await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).get();
  const existing = snap.exists
    ? parseRecommendationConfigDoc(snap.data() as Record<string, unknown>)
    : buildRecommendationSeedPayload();

  const merged: RecommendationConfig = {
    version: body.version ?? existing?.version ?? "1",
    masterVersion: body.masterVersion ?? existing?.masterVersion ?? "v1.20",
    recommendations: body.recommendations ?? existing?.recommendations ?? [],
    tagMappingRules: body.tagMappingRules ?? existing?.tagMappingRules ?? [],
    wellnessFields: body.wellnessFields ?? existing?.wellnessFields ?? [],
    derivedExclusionRules: body.derivedExclusionRules ?? existing?.derivedExclusionRules ?? [],
    healthExclusionByAnswer: body.healthExclusionByAnswer ?? existing?.healthExclusionByAnswer ?? {},
  };

  await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).set(
    {
      ...merged,
      recommendationCount: merged.recommendations.length,
      tagRuleCount: merged.tagMappingRules.length,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );

  clearRecommendationConfigCache();
  return NextResponse.json({ ok: true, recommendationCount: merged.recommendations.length });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

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
  return NextResponse.json({ ok: true, recommendationCount: payload.recommendations.length });
}
