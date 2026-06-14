import { DEFAULT_PERSONA_ALPHA, DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import type { PersonaScoringConfig } from "@/lib/scoring/persona-types";

let cache: { config: PersonaScoringConfig; at: number } | null = null;
const TTL_MS = 60_000;

export async function fetchPersonaScoringConfig(): Promise<PersonaScoringConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.config;
  try {
    const res = await fetch("/api/persona/scoring-config", { cache: "no-store" });
    if (!res.ok) throw new Error("config fetch failed");
    const j = (await res.json()) as PersonaScoringConfig;
    const config: PersonaScoringConfig = {
      centroids: j.centroids ?? DEFAULT_PERSONA_CENTROIDS,
      alpha: typeof j.alpha === "number" && j.alpha > 0 ? j.alpha : DEFAULT_PERSONA_ALPHA,
      formulaBands: j.formulaBands,
    };
    cache = { config, at: Date.now() };
    return config;
  } catch {
    return { centroids: DEFAULT_PERSONA_CENTROIDS, alpha: DEFAULT_PERSONA_ALPHA };
  }
}
