import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import {
  DEFAULT_REPORT_TEMPLATES,
  mergeReportTemplates,
} from "@/lib/admin/platform-config-defaults";
import { REPORT_TEMPLATES_DOC, type ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { firebaseAdminErrorHint } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ templates: DEFAULT_REPORT_TEMPLATES, defaults: DEFAULT_REPORT_TEMPLATES, firestoreDegraded: true });
  }

  const snap = await db.doc(REPORT_TEMPLATES_DOC).get();
  const templates = mergeReportTemplates(snap.exists ? (snap.data() as ReportTemplatesDoc) : null);
  return NextResponse.json({
    templates,
    defaults: DEFAULT_REPORT_TEMPLATES,
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

  const body = (await req.json().catch(() => null)) as Partial<ReportTemplatesDoc> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const templates = mergeReportTemplates(body);
  await db.doc(REPORT_TEMPLATES_DOC).set(
    { ...templates, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, templates });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server misconfigured", hint: firebaseAdminErrorHint() }, { status: 503 });
  }

  await db.doc(REPORT_TEMPLATES_DOC).set(
    { ...DEFAULT_REPORT_TEMPLATES, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, templates: DEFAULT_REPORT_TEMPLATES });
}
