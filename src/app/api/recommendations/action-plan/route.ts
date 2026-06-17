import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildStoredActionPlanCache,
  hashActionPlanInputs,
  readStoredActionPlanCache,
  toActionPlanApiPayload,
  type StoredActionPlanCache,
} from "@/lib/recommendations/action-plan-cache";
import {
  RecommendationConfigNotFoundError,
} from "@/lib/recommendations/load-recommendation-config";
import { runRecommendationEngine } from "@/lib/recommendations/run-engine";
import { getAdminFirestore } from "@/lib/firebase/server";
import { stripUndefinedDeep } from "@/lib/firebase/strip-undefined";
import { loadPersonaScoringConfigAdmin } from "@/lib/server/persona-config";
import { loadReportLlmProviderAdmin } from "@/lib/server/report-llm-config";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { personaNeedsRecompute } from "@/lib/scoring/normalize-persona";
import type { AttemptAnswers, AttemptScores } from "@/types/models";

export const runtime = "nodejs";

const bodySchema = z.object({
  attemptId: z.string().min(1).optional(),
  forceRegenerate: z.boolean().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
  scores: z
    .object({
      archetypeKey: z.string().optional(),
      secondaryArchetypeKey: z.string().optional(),
      persona: z.record(z.string(), z.unknown()).optional(),
      dimensions: z.record(z.string(), z.number()).optional(),
    })
    .optional()
    .nullable(),
});

function jsonFromCache(cache: StoredActionPlanCache) {
  return NextResponse.json({
    plan: cache.plan,
    inputHash: cache.inputHash,
    llmProvider: cache.llmProvider,
    cached: true,
  });
}

async function resolveScores(
  answers: AttemptAnswers,
  clientScores: AttemptScores | null | undefined,
  storedScores: AttemptScores | null | undefined,
): Promise<{ scores: AttemptScores; recomputed: boolean }> {
  const candidate = storedScores && !personaNeedsRecompute(storedScores.persona) ? storedScores : clientScores;
  if (candidate?.persona && !personaNeedsRecompute(candidate.persona) && candidate.dimensions) {
    return { scores: candidate, recomputed: false };
  }
  const personaConfig = await loadPersonaScoringConfigAdmin();
  return { scores: computeAttemptScores(answers, personaConfig), recomputed: true };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const answers = parsed.data.answers as AttemptAnswers;
    const attemptId = parsed.data.attemptId?.trim();
    const forceRegenerate = parsed.data.forceRegenerate === true;
    const clientScores = parsed.data.scores as AttemptScores | null | undefined;

    const db = attemptId ? getAdminFirestore() : null;
    let storedScores: AttemptScores | null | undefined;
    let attemptSnapExists = false;
    if (attemptId && db) {
      const snap = await db.collection("attempts").doc(attemptId).get();
      attemptSnapExists = snap.exists;
      if (snap.exists) {
        storedScores = snap.data()?.scores as AttemptScores | undefined;
      }
    }

    const { scores, recomputed } = await resolveScores(answers, clientScores, storedScores);
    const llmProvider = await loadReportLlmProviderAdmin();
    const inputHash = hashActionPlanInputs(answers, scores, llmProvider);

    if (!forceRegenerate && attemptId && db && attemptSnapExists) {
      const snap = await db.collection("attempts").doc(attemptId).get();
      const cached = readStoredActionPlanCache(snap.data()?.actionPlanCache, answers, scores, {
        currentProvider: llmProvider,
      });
      if (cached) return jsonFromCache(cached);
    }

    const plan = await runRecommendationEngine({ answers, scores }, { llmProvider });
    const apiPlan = toActionPlanApiPayload(plan);
    const cache = buildStoredActionPlanCache(inputHash, apiPlan, llmProvider);

    if (attemptId && db) {
      await db.collection("attempts").doc(attemptId).set(
        stripUndefinedDeep({
          actionPlanCache: cache,
          ...(recomputed ? { scores, personaAnalysis: scores.persona ?? null } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
    }

    return NextResponse.json({
      plan: apiPlan,
      inputHash,
      llmProvider,
      cached: false,
    });
  } catch (e) {
    if (e instanceof RecommendationConfigNotFoundError) {
      return NextResponse.json({ error: e.message, code: "recommendation_config_missing" }, { status: 503 });
    }
    const message = e instanceof Error ? e.message : "Recommendation engine failed";
    console.error("[recommendations/action-plan]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
