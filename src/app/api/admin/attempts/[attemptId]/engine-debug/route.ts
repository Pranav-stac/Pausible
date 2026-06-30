import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { buildAttemptEngineDebugPackage } from "@/lib/admin/build-attempt-engine-debug";
import { ACTION_PLAN_SYNTHESIS_VERSION } from "@/lib/recommendations/action-plan-cache";
import { RecommendationConfigNotFoundError } from "@/lib/recommendations/load-recommendation-config";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import { loadPersonaScoringConfigAdmin } from "@/lib/server/persona-config";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { personaNeedsRecompute } from "@/lib/scoring/normalize-persona";
import type { AttemptAnswers, AttemptScores } from "@/types/models";

export async function GET(req: NextRequest, ctx: { params: Promise<{ attemptId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { attemptId } = await ctx.params;
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: "Server misconfigured", hint: firebaseAdminErrorHint() },
      { status: 503 },
    );
  }

  try {
    const snap = await db.collection("attempts").doc(attemptId).get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const x = snap.data() ?? {};
    const answers = (typeof x.answers === "object" && x.answers ? x.answers : {}) as AttemptAnswers;
    let scores = (typeof x.scores === "object" ? x.scores : null) as AttemptScores | null;

    if (!scores?.persona || personaNeedsRecompute(scores.persona) || !scores.dimensions) {
      const personaConfig = await loadPersonaScoringConfigAdmin();
      scores = computeAttemptScores(answers, personaConfig);
    }

    const cache =
      x.actionPlanCache && typeof x.actionPlanCache === "object"
        ? (x.actionPlanCache as Record<string, unknown>)
        : null;

    const pkg = await buildAttemptEngineDebugPackage(
      { answers, scores },
      {
        inputHash: typeof cache?.inputHash === "string" ? cache.inputHash : null,
        synthesizedAt: typeof cache?.synthesizedAt === "string" ? cache.synthesizedAt : null,
      },
    );

    const cacheVersion =
      cache?.plan && typeof cache.plan === "object"
        ? (cache.plan as Record<string, unknown>).synthesisVersion
        : null;

    return NextResponse.json({
      attemptId,
      ...pkg,
      cacheMeta: {
        ...pkg.cacheMeta,
        versionMatch:
          typeof cacheVersion === "string"
            ? cacheVersion === ACTION_PLAN_SYNTHESIS_VERSION
            : pkg.cacheMeta.hasCache
              ? false
              : null,
        cacheSynthesisVersion: typeof cacheVersion === "string" ? cacheVersion : null,
        expectedSynthesisVersion: ACTION_PLAN_SYNTHESIS_VERSION,
      },
    });
  } catch (e) {
    if (e instanceof RecommendationConfigNotFoundError) {
      return NextResponse.json({ error: e.message, code: "recommendation_config_missing" }, { status: 503 });
    }
    if (isFirebaseAdminUnauthenticatedError(e)) {
      return NextResponse.json(
        { error: "Firebase Admin credentials rejected", hint: firebaseAdminErrorHint() },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : "Failed to build engine debug package";
    console.error("[admin/engine-debug]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
