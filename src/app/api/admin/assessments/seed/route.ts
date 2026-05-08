import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getDefaultAssessment } from "@/data/default-assessment";
import { getAdminFirestore } from "@/lib/firebase/server";

/** Writes bundled default assessment to Firestore so questions are editable and dynamic. */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

  const def = getDefaultAssessment();
  const snap = await db.collection("assessments").doc(def.id).get();
  const merge = snap.exists ? { merge: true } : { merge: false };

  await db.collection("assessments").doc(def.id).set(
    {
      ...def,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(merge.merge ? {} : { createdAt: FieldValue.serverTimestamp() }),
    } as Record<string, unknown>,
    merge,
  );

  return NextResponse.json({ ok: true, id: def.id });
}
