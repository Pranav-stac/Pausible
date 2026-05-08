import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";

function esc(c: string) {
  if (c.includes(",") || c.includes('"') || c.includes("\n")) {
    return `"${c.replace(/"/g, '""')}"`;
  }
  return c;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const limit = Math.min(8000, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "2000")));

  const snap = await db.collection("attempts").orderBy("createdAt", "desc").limit(limit).get();

  const header = [
    "attempt_id",
    "uid",
    "assessment_id",
    "payment_status",
    "provider",
    "payment_ref",
    "share_eligible",
    "share_token",
    "answer_count",
    "archetype",
    "created_at",
    "paid_at",
  ].join(",");

  const lines = snap.docs.map((d) => {
    const x = d.data();
    const answers = x.answers && typeof x.answers === "object" ? Object.keys(x.answers as object).length : 0;
    const arch =
      x.scores && typeof x.scores === "object" && (x.scores as { archetypeKey?: string }).archetypeKey
        ? String((x.scores as { archetypeKey?: string }).archetypeKey)
        : "";
    const row = [
      d.id,
      String(x.uid ?? ""),
      String(x.assessmentId ?? ""),
      String(x.paymentStatus ?? ""),
      x.paymentProvider != null ? String(x.paymentProvider) : "",
      x.paymentId != null ? String(x.paymentId) : "",
      Boolean(x.isLatestShareEligible) ? "yes" : "no",
      x.shareToken != null ? String(x.shareToken).slice(0, 40) : "",
      String(answers),
      arch,
      x.createdAt?.toDate?.()?.toISOString?.() ?? "",
      x.paidAt?.toDate?.()?.toISOString?.() ?? "",
    ].map((s) => esc(s));
    return row.join(",");
  });

  const body = [header, ...lines].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pausible-attempts.csv"',
    },
  });
}
