import { unstable_cache } from "next/cache";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition } from "@/types/models";

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

const cachedRequirePaymentBootstrap = unstable_cache(
  async () => {
    const db = getAdminFirestore();
    if (!db) return null;
    const snap = await db.doc("app_settings/global").get();
    if (!snap.exists) return true;
    return snap.data()?.requirePayment !== false;
  },
  ["pausible-app-settings-require-payment"],
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
  return cachedRequirePaymentBootstrap();
}
