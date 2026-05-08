import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ requirePayment: true });

  const snap = await db.doc("app_settings/global").get();
  if (!snap.exists) return NextResponse.json({ requirePayment: true });

  const d = snap.data() ?? {};
  return NextResponse.json({ requirePayment: d.requirePayment !== false });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: "Server missing Firebase Admin credentials (FIREBASE_ADMIN_CREDENTIALS_JSON or FIREBASE_ADMIN_CREDENTIALS_PATH)" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { requirePayment?: boolean };
  if (typeof body.requirePayment !== "boolean") {
    return NextResponse.json({ error: "requirePayment boolean required" }, { status: 400 });
  }

  await db.doc("app_settings/global").set(
    {
      requirePayment: body.requirePayment,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true, requirePayment: body.requirePayment });
}
