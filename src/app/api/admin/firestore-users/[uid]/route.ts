import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";

/** Set or revoke Firestore admin role (`users/{uid}.role === "admin"`). */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ uid: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { uid } = await ctx.params;
  if (!uid?.trim()) return NextResponse.json({ error: "uid required" }, { status: 400 });
  const targetUid = uid.trim();

  const body = (await req.json().catch(() => ({}))) as { role?: string | null };
  const wantsAdmin = body.role === "admin";

  if (!wantsAdmin && gate.uid === targetUid) {
    return NextResponse.json({ error: "You cannot revoke your own admin role from this panel." }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });

  const ref = db.collection("users").doc(targetUid);

  if (wantsAdmin) {
    await ref.set(
      {
        role: "admin",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } else {
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({
        role: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return NextResponse.json({ ok: true, uid: targetUid, role: wantsAdmin ? "admin" : null });
}
