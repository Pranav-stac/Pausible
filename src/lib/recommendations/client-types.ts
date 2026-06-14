import type { ActionPlan, ActionPlanSynthesis, GeminiTokenUsage, UserProfile } from "@/lib/recommendations/types";

export type ActionPlanApiResponse = {
  plan: {
    profile: UserProfile;
    synthesis: ActionPlanSynthesis;
    audit: {
      sourceIds: string[];
      rankedTop: { id: string; score: number; pillar: string; type: string }[];
      tokenUsage: GeminiTokenUsage | null;
    };
  };
};

export type { ActionPlan, ActionPlanSynthesis, GeminiTokenUsage };
