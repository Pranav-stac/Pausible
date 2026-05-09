import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/api/admin-auth";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition } from "@/types/models";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db)
    return NextResponse.json({ items: [], firestoreDegraded: true, firestoreMessage: firebaseAdminErrorHint() });

  try {
    const snap = await db.collection("assessments").get();
    const items = snap.docs.map((d) => {
      const x = d.data() as Partial<AssessmentDefinition>;
      const q = x.questions && typeof x.questions === "object" ? Object.keys(x.questions).length : 0;
      return {
        id: d.id,
        title: x.title ?? d.id,
        active: x.active !== false,
        questionCount: q,
        updatedAt: x.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });
    items.sort((a, b) => a.title.localeCompare(b.title));
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

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

  const raw = (await req.json().catch(() => null)) as
    | { createMinimal?: boolean; title?: string; id?: string }
    | AssessmentDefinition
    | null;

  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if ("createMinimal" in raw && raw.createMinimal === true) {
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : randomUUID();
    const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "New assessment";
    const minimal: AssessmentDefinition = {
      id,
      title,
      description: "",
      active: false,
      sections: [
        {
          id: "section_1",
          title: "Section 1",
          description: "",
          questionIds: ["q_1"],
        },
      ],
      questions: {
        q_1: {
          id: "q_1",
          prompt: "First question — edit me",
          caption: "",
          type: "likert",
          scaleMin: 1,
          scaleMax: 7,
          reverse: false,
          weights: { openness: 1 },
        },
      },
      interpretation: { archetypes: [] },
    };
    await db.collection("assessments").doc(id).set(
      {
        ...minimal,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      } as Record<string, unknown>,
    );
    return NextResponse.json({ ok: true, id });
  }

  const assessment = raw as AssessmentDefinition;

  if (!assessment || typeof assessment !== "object" || !assessment.sections || !assessment.questions) {
    return NextResponse.json({ error: "Invalid assessment JSON" }, { status: 400 });
  }

  const id =
    typeof assessment.id === "string" && assessment.id.trim()
      ? assessment.id.trim()
      : randomUUID();
  const payload = {
    ...assessment,
    id,
    active: assessment.active !== false,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  };

  await db.collection("assessments").doc(id).set(payload as Record<string, unknown>);
  return NextResponse.json({ ok: true, id });
}
