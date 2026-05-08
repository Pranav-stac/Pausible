import { unstable_cache } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition } from "@/types/models";
import { DEFAULT_PRICE_INR, effectiveAssessmentPriceInr } from "@/lib/pricing";

function omitFirestoreMeta(data: Record<string, unknown>): void {
  for (const k of ["createdAt", "updatedAt"] as const) {
    delete data[k];
  }
}

const cachedAssessmentBootstrap = unstable_cache(
  async (id: string) => {
    const db = getAdminFirestore();
    if (!db) return null;

    const snap = await db.collection("assessments").doc(id).get();
    if (!snap.exists) return null;

    const raw = { ...(snap.data() as Record<string, unknown>) };
    if (raw.active === false) return null;
    omitFirestoreMeta(raw);
    return { ...raw, id: snap.id } as AssessmentDefinition;
  },
  ["pausible-public-assessment"],
  { revalidate: 120 },
);

/** Single read of `app_settings/global` — shared cache for SSR hints. */
const cachedGlobalAppBootstrap = unstable_cache(
  async () => {
    const db = getAdminFirestore();
    if (!db)
      return { requirePayment: true, priceInr: DEFAULT_PRICE_INR >= 1 ? Math.round(DEFAULT_PRICE_INR) : 499 };

    const snap = await db.doc("app_settings/global").get();
    const d = snap.exists ? (snap.data() ?? {}) : {};
    return {
      requirePayment: snap.exists ? (d as { requirePayment?: boolean }).requirePayment !== false : true,
      priceInr: effectiveAssessmentPriceInr((d as { priceInr?: unknown }).priceInr),
    };
  },
  ["pausible-app-settings-global"],
  { revalidate: 60 },
);

/**
 * SSR/bootstrap via Admin SDK (no client Firestore/WebChannel).
 * Cached per assessment id across requests until revalidate expires.
 */
export async function loadPublicAssessmentForBootstrap(assessmentId: string): Promise<AssessmentDefinition | null> {
  const id = assessmentId?.trim() || "default";
  return cachedAssessmentBootstrap(id);
}

export async function loadPublicRequirePaymentBootstrap(): Promise<boolean | null> {
  const row = await cachedGlobalAppBootstrap();
  return row.requirePayment;
}

export async function loadPublicPriceBootstrap(): Promise<number> {
  const row = await cachedGlobalAppBootstrap();
  return row.priceInr;
}

export async function loadPublicAppSettingsBootstrap(): Promise<{ requirePayment: boolean; priceInr: number }> {
  return cachedGlobalAppBootstrap();
}
