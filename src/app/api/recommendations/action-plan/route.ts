import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RecommendationConfigNotFoundError,
} from "@/lib/recommendations/load-recommendation-config";
import { runRecommendationEngine } from "@/lib/recommendations/run-engine";
import type { AttemptAnswers, AttemptScores } from "@/types/models";

export const runtime = "nodejs";

const bodySchema = z.object({
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

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const plan = await runRecommendationEngine({
      answers: parsed.data.answers as AttemptAnswers,
      scores: parsed.data.scores as AttemptScores | null | undefined,
    });

    return NextResponse.json({
      plan: {
        profile: plan.profile,
        synthesis: plan.synthesis,
        audit: {
          sourceIds: plan.allSourceIds,
          rankedTop: plan.ranked.slice(0, 15).map((r) => ({
            id: r.id,
            score: r.score.total,
            pillar: r.pillar,
            type: r.type,
          })),
        },
      },
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
