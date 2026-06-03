import type { ActionPlan, ActionPlanSynthesis, UserProfile } from "@/lib/recommendations/types";

export type ActionPlanApiResponse = {
  plan: {
    profile: UserProfile;
    synthesis: ActionPlanSynthesis;
    audit: {
      sourceIds: string[];
      rankedTop: { id: string; score: number; pillar: string; type: string }[];
    };
  };
};

export type { ActionPlan, ActionPlanSynthesis };
