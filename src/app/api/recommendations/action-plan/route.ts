import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
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
import type { AttemptAnswers, AttemptScores } from "@/types/models";

export const runtime = "nodejs";

const bodySchema = z.object({
  attemptId: z.string().min(1).optional(),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
  scores: z
    .object({
      archetypeKey: z.string().optional(),
      secondaryArchetypeKey: z.string().optional(),
      persona: z
        .object({
          primaryPersona: z.string().optional(),
          secondaryPersona: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .nullable(),
});

function jsonFromCache(cache: StoredActionPlanCache) {
  return NextResponse.json({
    plan: cache.plan,
    inputHash: cache.inputHash,
    cached: true,
  });
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const answers = parsed.data.answers as AttemptAnswers;
    const scores = parsed.data.scores as AttemptScores | null | undefined;
    const inputHash = hashActionPlanInputs(answers, scores);
    const attemptId = parsed.data.attemptId?.trim();

    if (attemptId) {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db.collection("attempts").doc(attemptId).get();
        if (snap.exists) {
          const cached = readStoredActionPlanCache(snap.data()?.actionPlanCache, answers, scores);
          if (cached) return jsonFromCache(cached);
        }
      }
    }

    const plan = await runRecommendationEngine({ answers, scores });
    const apiPlan = toActionPlanApiPayload(plan);
    const cache: StoredActionPlanCache = {
      inputHash,
      plan: apiPlan,
      synthesizedAt: new Date().toISOString(),
    };

    if (attemptId) {
      const db = getAdminFirestore();
      if (db) {
        await db.collection("attempts").doc(attemptId).set(
          {
            actionPlanCache: cache,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }
    }

    return NextResponse.json({
      plan: apiPlan,
      inputHash,
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
