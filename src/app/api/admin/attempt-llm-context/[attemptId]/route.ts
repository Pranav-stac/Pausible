import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { buildAttemptLlmContextPackage, attachSynthesisOutputs } from "@/lib/recommendations/build-attempt-llm-context";
import type { ActionPlanSynthesis } from "@/lib/recommendations/types";
import { parseReportLlmProvider } from "@/lib/recommendations/report-llm-types";
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

    const pkg = await buildAttemptLlmContextPackage({ answers, scores });

    const cache = x.actionPlanCache;
    const cacheRow = cache && typeof cache === "object" ? (cache as Record<string, unknown>) : null;
    const plan = cacheRow?.plan && typeof cacheRow.plan === "object" ? (cacheRow.plan as Record<string, unknown>) : null;
    const synthesis =
      plan?.synthesis && typeof plan.synthesis === "object"
        ? (plan.synthesis as ActionPlanSynthesis)
        : null;
    const synthesizedAt = typeof cacheRow?.synthesizedAt === "string" ? cacheRow.synthesizedAt : undefined;
    const cacheProvider = parseReportLlmProvider(cacheRow?.llmProvider);

    const enriched = attachSynthesisOutputs(pkg, synthesis, {
      synthesizedAt,
      llmProvider: cacheProvider,
    });

    return NextResponse.json({ attemptId, ...enriched });
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
    const message = e instanceof Error ? e.message : "Failed to build LLM context";
    console.error("[admin/attempt-llm-context]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
