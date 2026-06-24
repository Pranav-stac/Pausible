import type { ActionPlan, ActionPlanSynthesis, GeminiTokenUsage, UserProfile } from "@/lib/recommendations/types";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";

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
  inputHash?: string;
  llmProvider?: ReportLlmProvider;
  cached?: boolean;
  reportDisplayName?: string | null;
};

export type { ActionPlan, ActionPlanSynthesis, GeminiTokenUsage };
