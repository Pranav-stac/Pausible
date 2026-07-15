import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getWellnessContextQuestionnaire, stripProfileSourcedWellnessQuestions, wellnessContextAssessmentId } from "@/data/wellness-context-questionnaire";
import { getAdminFirestore } from "@/lib/firebase/server";

/** Writes bundled wellness context questionnaire to Firestore (`assessments/wellness-context`). */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

  const def = stripProfileSourcedWellnessQuestions(getWellnessContextQuestionnaire());
  const snap = await db.collection("assessments").doc(wellnessContextAssessmentId).get();
  const merge = snap.exists ? { merge: true } : { merge: false };

  await db.collection("assessments").doc(wellnessContextAssessmentId).set(
    {
      ...def,
      id: wellnessContextAssessmentId,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      ...(merge.merge ? {} : { createdAt: FieldValue.serverTimestamp() }),
    } as Record<string, unknown>,
    merge,
  );

  return NextResponse.json({ ok: true, id: wellnessContextAssessmentId });
}
