import { DEFAULT_PERSONA_ALPHA, DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import { mergeCentroidsFromFirestore } from "@/lib/scoring/persona";
import type { PersonaCentroidTable, PersonaScoringConfig } from "@/lib/scoring/persona-types";
import { PERSONA_KEYS, TRAIT_KEYS } from "@/lib/scoring/persona-types";
import type { AppSettingsDoc } from "@/types/models";
import { getAdminFirestore } from "@/lib/firebase/server";
import { loadScoringConfigAdmin } from "@/lib/server/platform-config";

const CENTROIDS_DOC = "persona_centroids/default";

function parseCentroidsDoc(data: Record<string, unknown> | undefined): Partial<PersonaCentroidTable> | null {
  if (!data?.centroids || typeof data.centroids !== "object") return null;
  const raw = data.centroids as Record<string, unknown>;
  const partial = {} as Partial<PersonaCentroidTable>;
  for (const persona of PERSONA_KEYS) {
    const row = raw[persona];
    if (!row || typeof row !== "object") continue;
    const vec = {} as Partial<Record<(typeof TRAIT_KEYS)[number], number>>;
    for (const trait of TRAIT_KEYS) {
      const v = (row as Record<string, unknown>)[trait];
      if (typeof v === "number" && Number.isFinite(v)) vec[trait] = v;
    }
    if (Object.keys(vec).length) partial[persona] = vec as PersonaCentroidTable[typeof persona];
  }
  return partial;
}

export function effectivePersonaAlpha(settings: AppSettingsDoc | null | undefined): number {
  const a = settings?.personaAlpha;
  if (typeof a === "number" && Number.isFinite(a) && a > 0 && a <= 20) return a;
  return DEFAULT_PERSONA_ALPHA;
}

export async function loadPersonaScoringConfigAdmin(): Promise<PersonaScoringConfig> {
  const db = getAdminFirestore();
  if (!db) {
    const scoring = await loadScoringConfigAdmin();
    return {
      centroids: DEFAULT_PERSONA_CENTROIDS,
      alpha: DEFAULT_PERSONA_ALPHA,
      formulaBands: {
        fitTierBands: scoring.fitTierBands,
        blendRatioBands: scoring.blendRatioBands,
        traitDeviationThreshold: scoring.traitDeviationThreshold,
      },
    };
  }

  const [centroidsSnap, settingsSnap, scoring] = await Promise.all([
    db.doc(CENTROIDS_DOC).get(),
    db.doc("app_settings/global").get(),
    loadScoringConfigAdmin(),
  ]);

  const partial = centroidsSnap.exists
    ? parseCentroidsDoc(centroidsSnap.data() as Record<string, unknown>)
    : null;
  const settings = settingsSnap.exists ? ((settingsSnap.data() ?? {}) as AppSettingsDoc) : {};

  return {
    centroids: mergeCentroidsFromFirestore(partial),
    alpha: effectivePersonaAlpha(settings),
    formulaBands: {
      fitTierBands: scoring.fitTierBands,
      blendRatioBands: scoring.blendRatioBands,
      traitDeviationThreshold: scoring.traitDeviationThreshold,
    },
  };
}

export function centroidsDocPayload(centroids: PersonaCentroidTable) {
  return { centroids, updatedAt: new Date().toISOString() };
}
