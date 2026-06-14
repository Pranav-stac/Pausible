import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { OCEAN_TAG_CONFIG_DOC } from "@/app/api/admin/ocean-tags/seed/route";
import { firebaseAdminErrorHint } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import { exportOceanTagConfigForStorage } from "@/lib/scoring/ocean-tags";

export type OceanTagConfigDoc = ReturnType<typeof exportOceanTagConfigForStorage>;

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const defaults = exportOceanTagConfigForStorage();
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ config: defaults, defaults, firestoreDegraded: true });
  }

  const snap = await db.doc(OCEAN_TAG_CONFIG_DOC).get();
  const config = snap.exists ? (snap.data() as OceanTagConfigDoc) : defaults;
  return NextResponse.json({
    config,
    defaults,
    seeded: snap.exists,
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

  const body = (await req.json().catch(() => null)) as OceanTagConfigDoc | null;
  if (!body?.traitTags || !body?.categoryTags) {
    return NextResponse.json({ error: "Send full ocean tag config" }, { status: 400 });
  }

  await db.doc(OCEAN_TAG_CONFIG_DOC).set(
    { ...body, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server misconfigured", hint: firebaseAdminErrorHint() }, { status: 503 });
  }

  const payload = exportOceanTagConfigForStorage();
  await db.doc(OCEAN_TAG_CONFIG_DOC).set(
    { ...payload, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, config: payload });
}
