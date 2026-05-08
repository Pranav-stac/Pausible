import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition } from "@/types/models";

async function adminGate(req: NextRequest) {
  return requireAdmin(req);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await adminGate(req);
  if (!adminUser.ok) return adminUser.response;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as AssessmentDefinition | null;
  if (!body || typeof body !== "object" || !body.sections || !body.questions) {
    return NextResponse.json({ error: "Invalid assessment body" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "No admin SDK" }, { status: 503 });

  const snap = await db.collection("assessments").doc(id).get();

  const rest = { ...(body as AssessmentDefinition & Record<string, unknown>) };
  delete rest.updatedAt;
  delete rest.createdAt;

  await db.collection("assessments").doc(id).set(
    {
      ...rest,
      id,
      updatedAt: FieldValue.serverTimestamp(),
      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    } as Record<string, unknown>,
    { merge: false },
  );

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const adminUser = await adminGate(req);
  if (!adminUser.ok) return adminUser.response;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { active?: boolean };
  if (typeof body.active !== "boolean") {
    return NextResponse.json({ error: "active boolean required" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "No admin SDK" }, { status: 503 });

  await db.collection("assessments").doc(id).set(
    {
      active: body.active,
      updatedAt: FieldValue.serverTimestamp(),
    } as Record<string, unknown>,
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}
