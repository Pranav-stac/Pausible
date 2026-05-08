import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({
      attemptCount: 0,
      paidCount: 0,
      pendingCount: 0,
      uniqueUsers: 0,
      byAssessment: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      last30Days: [] as { day: string; count: number; paid: number; pending: number }[],
    });
  }

  const snap = await db.collection("attempts").orderBy("createdAt", "desc").limit(3000).get();

  const last30Totals: Record<string, number> = {};
  const last30Paid: Record<string, number> = {};
  const last30Pending: Record<string, number> = {};
  const now = Date.now();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    last30Totals[key] = 0;
    last30Paid[key] = 0;
    last30Pending[key] = 0;
  }

  const byAssessment: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  const uids = new Set<string>();
  let paidCount = 0;
  let pendingCount = 0;

  snap.docs.forEach((docSnap) => {
    const x = docSnap.data();
    const uid = String(x.uid ?? "");
    if (uid) uids.add(uid);

    const aid = String(x.assessmentId ?? "unknown");
    byAssessment[aid] = (byAssessment[aid] ?? 0) + 1;

    const st = String(x.paymentStatus ?? "");
    if (st === "paid") paidCount++;
    else if (st === "pending") pendingCount++;

    const prov = String(x.paymentProvider ?? "none");
    byProvider[prov] = (byProvider[prov] ?? 0) + 1;

    const iso = x.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 10);
    if (iso && iso in last30Totals) {
      last30Totals[iso]++;
      if (st === "paid") last30Paid[iso]++;
      if (st === "pending") last30Pending[iso]++;
    }
  });

  const last30Days = Object.keys(last30Totals)
    .sort((a, b) => a.localeCompare(b))
    .map((day) => ({
      day,
      count: last30Totals[day],
      paid: last30Paid[day],
      pending: last30Pending[day],
    }));

  return NextResponse.json({
    attemptCount: snap.docs.length,
    paidCount,
    pendingCount,
    uniqueUsers: uids.size,
    byAssessment,
    byProvider,
    last30Days,
  });
}
