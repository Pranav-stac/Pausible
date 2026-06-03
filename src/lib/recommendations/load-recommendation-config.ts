import {
  parseRecommendationConfigDoc,
  RECOMMENDATION_CONFIG_DOC_PATH,
  type RecommendationConfig,
} from "@/lib/recommendations/firestore-config-types";
import { getAdminFirestore } from "@/lib/firebase/server";

let cached: RecommendationConfig | null = null;

export class RecommendationConfigNotFoundError extends Error {
  constructor() {
    super(
      "Recommendation config is not in Firestore. Run POST /api/admin/recommendations/seed as an admin to upload structured data.",
    );
    this.name = "RecommendationConfigNotFoundError";
  }
}

export function clearRecommendationConfigCache(): void {
  cached = null;
}

export async function loadRecommendationConfig(): Promise<RecommendationConfig> {
  if (cached) return cached;

  const db = getAdminFirestore();
  if (!db) throw new RecommendationConfigNotFoundError();

  const snap = await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).get();
  if (!snap.exists) throw new RecommendationConfigNotFoundError();

  const parsed = parseRecommendationConfigDoc(snap.data() as Record<string, unknown>);
  if (!parsed?.recommendations.length) throw new RecommendationConfigNotFoundError();

  cached = parsed;
  return parsed;
}
