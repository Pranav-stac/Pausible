import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";
import { DEFAULT_PRICE_INR, effectiveAssessmentPriceInr } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db)
    return NextResponse.json({
      requirePayment: true,
      priceInr: effectiveAssessmentPriceInr(undefined),
    });

  const snap = await db.doc("app_settings/global").get();
  const d = snap.exists ? ((snap.data() ?? {}) as { requirePayment?: boolean; priceInr?: unknown }) : {};
  return NextResponse.json({
    requirePayment: snap.exists ? d.requirePayment !== false : true,
    priceInr: effectiveAssessmentPriceInr(d.priceInr),
    envDefaultPriceInr:
      DEFAULT_PRICE_INR >= 1 && DEFAULT_PRICE_INR <= 500_000 ? Math.round(DEFAULT_PRICE_INR) : 499,
  });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      {
        error:
          "Server missing Firebase Admin credentials (FIREBASE_ADMIN_CREDENTIALS_JSON or FIREBASE_ADMIN_CREDENTIALS_PATH)",
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    requirePayment?: boolean;
    priceInr?: number | null;
  };

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  let touched = false;

  if (typeof body.requirePayment === "boolean") {
    patch.requirePayment = body.requirePayment;
    touched = true;
  }

  if ("priceInr" in body) {
    touched = true;
    if (body.priceInr === null) {
      patch.priceInr = FieldValue.delete();
    } else if (typeof body.priceInr === "number") {
      const r = Math.round(body.priceInr);
      if (r < 1 || r > 500_000) {
        return NextResponse.json({ error: "priceInr must be between 1 and 500000 INR" }, { status: 400 });
      }
      patch.priceInr = r;
    } else {
      return NextResponse.json({ error: "priceInr must be a finite number or null" }, { status: 400 });
    }
  }

  if (!touched) {
    return NextResponse.json({ error: "Send requirePayment and/or priceInr" }, { status: 400 });
  }

  const ref = db.doc("app_settings/global");
  await ref.set(patch, { merge: true });

  const snap2 = await ref.get();
  const d2 =
    snap2.exists ? ((snap2.data() ?? {}) as { requirePayment?: boolean; priceInr?: unknown }) : {};
  return NextResponse.json({
    ok: true,
    requirePayment: snap2.exists ? d2.requirePayment !== false : true,
    priceInr: effectiveAssessmentPriceInr(d2.priceInr),
    envDefaultPriceInr:
      DEFAULT_PRICE_INR >= 1 && DEFAULT_PRICE_INR <= 500_000 ? Math.round(DEFAULT_PRICE_INR) : 499,
  });
}
