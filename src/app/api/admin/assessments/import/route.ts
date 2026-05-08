import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition } from "@/types/models";

/** Bulk write multiple assessments (replaces each doc by id). */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "No admin SDK" }, { status: 503 });

  const raw = (await req.json().catch(() => null)) as { assessments?: AssessmentDefinition[] } | null;
  const list = raw?.assessments;
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ error: "assessments[] required" }, { status: 400 });
  }
  if (list.length > 25) {
    return NextResponse.json({ error: "Max 25 per request" }, { status: 400 });
  }

  const batch = db.batch();
  const written: string[] = [];

  for (const a of list) {
    if (!a?.id || !a.sections || !a.questions) continue;
    const ref = db.collection("assessments").doc(a.id);
    batch.set(
      ref,
      {
        ...a,
        id: a.id,
        active: a.active !== false,
        updatedAt: FieldValue.serverTimestamp(),
      } as Record<string, unknown>,
      { merge: true },
    );
    written.push(a.id);
  }

  await batch.commit();
  return NextResponse.json({ ok: true, count: written.length, ids: written });
}
