import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import {
  buildDefaultPersonaCatalog,
  mergePersonaCatalog,
} from "@/lib/admin/platform-config-defaults";
import { PERSONA_CATALOG_DOC, type PersonaCatalogDoc } from "@/lib/admin/platform-config-types";
import { firebaseAdminErrorHint } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import { PERSONA_KEYS } from "@/lib/scoring/persona-types";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const defaults = buildDefaultPersonaCatalog();
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ catalog: defaults, defaults, personaKeys: PERSONA_KEYS, firestoreDegraded: true });
  }

  const snap = await db.doc(PERSONA_CATALOG_DOC).get();
  const catalog = mergePersonaCatalog(snap.exists ? (snap.data() as PersonaCatalogDoc) : null);
  return NextResponse.json({
    catalog,
    defaults,
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

  const body = (await req.json().catch(() => null)) as Partial<PersonaCatalogDoc> | null;
  if (!body?.personas) {
    return NextResponse.json({ error: "Send { personas: PersonaCatalogDoc.personas }" }, { status: 400 });
  }

  const catalog = mergePersonaCatalog(body as PersonaCatalogDoc);
  await db.doc(PERSONA_CATALOG_DOC).set(
    { ...catalog, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, catalog });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server misconfigured", hint: firebaseAdminErrorHint() }, { status: 503 });
  }

  const defaults = buildDefaultPersonaCatalog();
  await db.doc(PERSONA_CATALOG_DOC).set(
    { ...defaults, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, catalog: defaults });
}
