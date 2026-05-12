import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const limit = Math.min(500, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "120")));

  const db = getAdminFirestore();
  if (!db)
    return NextResponse.json({ items: [], firestoreDegraded: true, firestoreMessage: firebaseAdminErrorHint() });

  try {
    const snap = await db.collection("attempts").orderBy("createdAt", "desc").limit(limit).get();
    const items = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        uid: String(x.uid ?? ""),
        ownerType: x.ownerType === "google" || x.ownerType === "local" ? String(x.ownerType) : "anonymous",
        ownerEmail: x.ownerEmail != null ? String(x.ownerEmail) : null,
        assessmentId: String(x.assessmentId ?? ""),
        paymentStatus: String(x.paymentStatus ?? ""),
        paymentProvider: x.paymentProvider != null ? String(x.paymentProvider) : null,
        paymentId: x.paymentId != null ? String(x.paymentId) : null,
        shareToken: x.shareToken != null ? String(x.shareToken) : null,
        isLatestShareEligible: Boolean(x.isLatestShareEligible),
        createdAt: x.createdAt?.toDate?.()?.toISOString?.() ?? null,
        paidAt: x.paidAt?.toDate?.()?.toISOString?.() ?? null,
        claimedAt: x.claimedAt?.toDate?.()?.toISOString?.() ?? null,
        answerCount:
          x.answers && typeof x.answers === "object"
            ? Object.keys(x.answers as Record<string, unknown>).length
            : 0,
        archetypeKey:
          x.scores && typeof x.scores === "object" && (x.scores as { archetypeKey?: string }).archetypeKey
            ? String((x.scores as { archetypeKey?: string }).archetypeKey)
            : null,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    if (isFirebaseAdminUnauthenticatedError(e)) {
      return NextResponse.json({
        items: [],
        firestoreDegraded: true,
        firestoreMessage: firebaseAdminErrorHint(),
      });
    }
    throw e;
  }
}
