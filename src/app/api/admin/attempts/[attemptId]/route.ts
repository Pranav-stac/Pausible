import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";

function serializeValue(v: unknown): unknown {
  if (v && typeof v === "object") {
    const o = v as { toDate?: () => Date };
    if (typeof o.toDate === "function") {
      try {
        return o.toDate().toISOString();
      } catch {
        return null;
      }
    }
  }
  return v;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ attemptId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { attemptId } = await ctx.params;
  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const snap = await db.collection("attempts").doc(attemptId).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const x = snap.data() ?? {};
  const answers = typeof x.answers === "object" && x.answers ? (x.answers as Record<string, unknown>) : {};
  const scores = typeof x.scores === "object" ? x.scores : null;

  return NextResponse.json({
    id: snap.id,
    uid: String(x.uid ?? ""),
    assessmentId: String(x.assessmentId ?? ""),
    paymentStatus: String(x.paymentStatus ?? ""),
    paymentProvider: x.paymentProvider != null ? String(x.paymentProvider) : null,
    paymentId: x.paymentId != null ? String(x.paymentId) : null,
    shareToken: x.shareToken != null ? String(x.shareToken) : null,
    isLatestShareEligible: Boolean(x.isLatestShareEligible),
    createdAt: serializeValue(x.createdAt),
    paidAt: serializeValue(x.paidAt),
    answersCount: Object.keys(answers).length,
    answersPreview: answers,
    scores,
    resultsUrl: `/results/${snap.id}`,
  });
}
