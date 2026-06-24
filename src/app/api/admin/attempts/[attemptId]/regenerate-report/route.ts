import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import {
  buildStoredActionPlanCache,
  hashActionPlanInputs,
  toActionPlanApiPayload,
} from "@/lib/recommendations/action-plan-cache";
import { RecommendationConfigNotFoundError } from "@/lib/recommendations/load-recommendation-config";
import { reportLlmModel } from "@/lib/recommendations/report-llm-types";
import { runRecommendationEngine } from "@/lib/recommendations/run-engine";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import { stripUndefinedDeep } from "@/lib/firebase/strip-undefined";
import { loadPersonaScoringConfigAdmin } from "@/lib/server/persona-config";
import { loadReportLlmProviderAdmin } from "@/lib/server/report-llm-config";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import type { AttemptAnswers } from "@/types/models";

export async function POST(req: NextRequest, ctx: { params: Promise<{ attemptId: string }> }) {
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
    const personaConfig = await loadPersonaScoringConfigAdmin();
    const scores = computeAttemptScores(answers, personaConfig);
    const llmProvider = await loadReportLlmProviderAdmin();
    const model = reportLlmModel(llmProvider);

    const apiKey =
      llmProvider === "gpt" ? process.env.OPENAI_API_KEY?.trim() : process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            llmProvider === "gpt"
              ? "OPENAI_API_KEY is not set on the server — GPT cannot run."
              : "GEMINI_API_KEY is not set on the server — Gemini cannot run.",
          llmProvider,
          model,
        },
        { status: 503 },
      );
    }

    const plan = await runRecommendationEngine({ answers, scores }, { llmProvider });
    const apiPlan = toActionPlanApiPayload(plan);
    const inputHash = hashActionPlanInputs(answers, scores, llmProvider);
    const cache = buildStoredActionPlanCache(inputHash, apiPlan, llmProvider);
    const reportDisplayName = plan.synthesis.reportDisplayName?.trim() || null;

    await db.collection("attempts").doc(attemptId).set(
      stripUndefinedDeep({
        actionPlanCache: cache,
        ...(reportDisplayName ? { reportDisplayName } : {}),
        scores,
        personaAnalysis: scores.persona ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

    const synthesis = plan.synthesis;
    return NextResponse.json({
      ok: true,
      attemptId,
      llmProvider,
      model,
      synthesized: synthesis.synthesized,
      synthesisError: synthesis.synthesisError ?? null,
      tokenUsage: synthesis.tokenUsage ?? null,
      cachedAt: cache.synthesizedAt,
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
    const message = e instanceof Error ? e.message : "Report regeneration failed";
    console.error("[admin/attempts/regenerate-report]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
