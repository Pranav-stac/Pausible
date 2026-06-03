import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminFirestore } from "@/lib/firebase/server";
import { exportOceanTagConfigForStorage } from "@/lib/scoring/ocean-tags";

export const OCEAN_TAG_CONFIG_DOC = "ocean_tag_config/active";

/** Upload OCEAN trait + category tag bands to Firestore (tags only, for analytics). */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server missing admin credentials" }, { status: 503 });
  }

  const payload = exportOceanTagConfigForStorage();

  await db.doc(OCEAN_TAG_CONFIG_DOC).set(
    {
      ...payload,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );

  return NextResponse.json({
    ok: true,
    path: OCEAN_TAG_CONFIG_DOC,
    traitBandCount: payload.traitTags.length,
    categoryBandCount: payload.categoryTags.length,
  });
}
