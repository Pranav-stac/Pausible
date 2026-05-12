import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { verifyIdToken } from "@/lib/api/verify-user";
import { getAdminFirestore } from "@/lib/firebase/server";

const bodySchema = z.object({
  attemptId: z.string().min(1),
  claimSecret: z.string().min(16).max(256),
});

function secretsEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const json: unknown = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await verifyIdToken(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getAdminFirestore();
  if (!db) return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });

  const { attemptId, claimSecret } = parsed.data;
  const ref = db.collection("attempts").doc(attemptId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snap.data()!;
  const ownerUid = String(data.uid ?? "");
  const storedSecret = data.claimSecret;
  if (typeof storedSecret !== "string" || storedSecret.length < 16) {
    return NextResponse.json({ error: "This attempt cannot be claimed from another profile" }, { status: 400 });
  }
  if (!secretsEqual(storedSecret, claimSecret)) {
    return NextResponse.json({ error: "Invalid claim" }, { status: 403 });
  }

  if (ownerUid === user.uid) {
    await ref.update({ claimSecret: FieldValue.delete() }).catch(() => {});
    return NextResponse.json({ ok: true, transferred: false });
  }

  await ref.update({
    uid: user.uid,
    claimSecret: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, transferred: true });
}
