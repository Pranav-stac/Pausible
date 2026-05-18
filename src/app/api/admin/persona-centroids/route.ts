import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/api/admin-auth";
import { firebaseAdminErrorHint } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import { DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import { mergeCentroidsFromFirestore } from "@/lib/scoring/persona";
import type { PersonaCentroidTable } from "@/lib/scoring/persona-types";
import { PERSONA_KEYS, TRAIT_KEYS } from "@/lib/scoring/persona-types";
import { centroidsDocPayload } from "@/lib/server/persona-config";

const CENTROIDS_DOC = "persona_centroids/default";

function validateCentroids(body: unknown): PersonaCentroidTable | null {
  if (!body || typeof body !== "object") return null;
  const centroids = (body as { centroids?: unknown }).centroids;
  if (!centroids || typeof centroids !== "object") return null;
  return mergeCentroidsFromFirestore(centroids as Partial<PersonaCentroidTable>);
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { centroids: DEFAULT_PERSONA_CENTROIDS, defaults: DEFAULT_PERSONA_CENTROIDS, firestoreDegraded: true },
      { status: 200 },
    );
  }

  const snap = await db.doc(CENTROIDS_DOC).get();
  const partial =
    snap.exists && snap.data()?.centroids
      ? (snap.data()?.centroids as Partial<PersonaCentroidTable>)
      : null;

  return NextResponse.json({
    centroids: mergeCentroidsFromFirestore(partial),
    defaults: DEFAULT_PERSONA_CENTROIDS,
    traitKeys: TRAIT_KEYS,
    personaKeys: PERSONA_KEYS,
    updatedAt: snap.exists ? snap.data()?.updatedAt : null,
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server misconfigured", hint: firebaseAdminErrorHint() }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const centroids = validateCentroids(body);
  if (!centroids) {
    return NextResponse.json({ error: "Send { centroids: PersonaCentroidTable }" }, { status: 400 });
  }

  await db.doc(CENTROIDS_DOC).set(
    { ...centroidsDocPayload(centroids), updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  return NextResponse.json({ ok: true, centroids });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server misconfigured", hint: firebaseAdminErrorHint() }, { status: 503 });
  }

  await db.doc(CENTROIDS_DOC).set({
    centroids: DEFAULT_PERSONA_CENTROIDS,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, centroids: DEFAULT_PERSONA_CENTROIDS });
}
