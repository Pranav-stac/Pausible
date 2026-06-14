import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import {
  DEFAULT_SCORING_CONFIG,
  mergeScoringConfig,
} from "@/lib/admin/platform-config-defaults";
import { SCORING_CONFIG_DOC, type ScoringConfigDoc } from "@/lib/admin/platform-config-types";
import { firebaseAdminErrorHint } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";

function validateBody(body: unknown): ScoringConfigDoc | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Partial<ScoringConfigDoc>;
  const merged = mergeScoringConfig(b);
  if (merged.likertMin >= merged.likertMax) return null;
  const { classic, core, adaptive, emerging } = merged.fitTierBands;
  if (!(classic > core && core > adaptive && adaptive > emerging)) return null;
  if (!(merged.blendRatioBands.pure > merged.blendRatioBands.tendencies)) return null;
  return merged;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ config: DEFAULT_SCORING_CONFIG, defaults: DEFAULT_SCORING_CONFIG, firestoreDegraded: true });
  }

  const snap = await db.doc(SCORING_CONFIG_DOC).get();
  const config = mergeScoringConfig(snap.exists ? (snap.data() as ScoringConfigDoc) : null);
  return NextResponse.json({
    config,
    defaults: DEFAULT_SCORING_CONFIG,
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
  const config = validateBody(body);
  if (!config) {
    return NextResponse.json({ error: "Invalid scoring config body" }, { status: 400 });
  }

  await db.doc(SCORING_CONFIG_DOC).set(
    { ...config, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, config });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "Server misconfigured", hint: firebaseAdminErrorHint() }, { status: 503 });
  }

  await db.doc(SCORING_CONFIG_DOC).set(
    { ...DEFAULT_SCORING_CONFIG, updatedAt: FieldValue.serverTimestamp() },
    { merge: false },
  );
  return NextResponse.json({ ok: true, config: DEFAULT_SCORING_CONFIG });
}
