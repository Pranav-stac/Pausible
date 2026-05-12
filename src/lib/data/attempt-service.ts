"use client";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { AttemptAnswers, AttemptScores } from "@/types/models";
import {
  localGetAttempt,
  localListAttemptsForUser,
  localSaveAttempt,
  localUpdateAttempt,
  type SerializedAttempt,
} from "@/lib/local/attempts";

/** Firestore writes require a signed-in user; otherwise use localStorage (same as no Firebase). */
function persistLocally(): boolean {
  if (!isFirebaseConfigured()) return true;
  return getFirebaseAuth()?.currentUser == null;
}

export type WritableAttempt = {
  id: string;
  uid: string;
  assessmentId: string;
  answers: AttemptAnswers;
  scores?: AttemptScores | null;
  paymentStatus: SerializedAttempt["paymentStatus"];
  paymentProvider?: SerializedAttempt["paymentProvider"];
  paymentId?: string;
  shareToken?: string | null;
  isLatestShareEligible?: boolean;
  /** Same-tab proof so a later Google sign-in can claim this attempt (see /api/attempts/claim). */
  claimSecret?: string | null;
};

function toSerialized(a: WritableAttempt & { createdAtIso?: string; paidAtIso?: string }): SerializedAttempt {
  return {
    id: a.id,
    uid: a.uid,
    assessmentId: a.assessmentId,
    answers: a.answers,
    scores: a.scores,
    paymentStatus: a.paymentStatus,
    paymentProvider: a.paymentProvider,
    paymentId: a.paymentId,
    shareToken: a.shareToken,
    isLatestShareEligible: a.isLatestShareEligible,
    createdAtIso: a.createdAtIso,
    paidAtIso: a.paidAtIso,
  };
}

export async function upsertAttempt(data: WritableAttempt): Promise<void> {
  if (persistLocally()) {
    localSaveAttempt(toSerialized({ ...data, createdAtIso: new Date().toISOString() }));
    return;
  }
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore unavailable");

  const ref = doc(db, "attempts", data.id);
  const exists = await getDoc(ref).then((s) => s.exists());

  const payload: Record<string, unknown> = {
    uid: data.uid,
    assessmentId: data.assessmentId,
    answers: data.answers,
    scores: data.scores ?? null,
    paymentStatus: data.paymentStatus,
    paymentProvider: data.paymentProvider ?? null,
    paymentId: data.paymentId ?? null,
    shareToken: data.shareToken ?? null,
    isLatestShareEligible: Boolean(data.isLatestShareEligible),
    updatedAt: serverTimestamp(),
    ...(exists ? {} : { createdAt: serverTimestamp() }),
  };
  if (data.claimSecret != null && data.claimSecret !== "") {
    payload.claimSecret = data.claimSecret;
  }
  await setDoc(ref, payload, { merge: true });
}

export async function patchAttempt(attemptId: string, patch: Partial<WritableAttempt>): Promise<void> {
  if (persistLocally()) {
    const mapped: Partial<SerializedAttempt> = { ...patch };
    if (patch.paymentStatus === "paid") mapped.paidAtIso = new Date().toISOString();
    localUpdateAttempt(attemptId, mapped);
    return;
  }
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore unavailable");
  const payload: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.paymentStatus === "paid") payload.paidAt = serverTimestamp();
  await updateDoc(doc(db, "attempts", attemptId), payload);
}

export async function fetchAttempt(attemptId: string): Promise<SerializedAttempt | null> {
  if (persistLocally()) {
    return localGetAttempt(attemptId);
  }
  const db = getFirebaseDb();
  if (!db) return null;
  let snap;
  try {
    snap = await getDoc(doc(db, "attempts", attemptId));
  } catch {
    return null;
  }
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    uid: String(d.uid),
    assessmentId: String(d.assessmentId),
    answers: d.answers as AttemptAnswers,
    scores: (d.scores ?? null) as AttemptScores | null,
    paymentStatus: d.paymentStatus,
    paymentProvider: d.paymentProvider,
    paymentId: d.paymentId,
    shareToken: d.shareToken ?? null,
    isLatestShareEligible: Boolean(d.isLatestShareEligible),
    createdAtIso: d.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
    paidAtIso: d.paidAt?.toDate?.()?.toISOString?.() ?? undefined,
  };
}

export async function listMyAttempts(uid: string): Promise<SerializedAttempt[]> {
  if (persistLocally()) {
    return localListAttemptsForUser();
  }
  const db = getFirebaseDb();
  if (!db) return [];
  const q = query(collection(db, "attempts"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((s) => {
    const d = s.data();
    return {
      id: s.id,
      uid: String(d.uid),
      assessmentId: String(d.assessmentId),
      answers: d.answers as AttemptAnswers,
      scores: (d.scores ?? null) as AttemptScores | null,
      paymentStatus: d.paymentStatus,
      paymentProvider: d.paymentProvider,
      paymentId: d.paymentId,
      shareToken: d.shareToken ?? null,
      isLatestShareEligible: Boolean(d.isLatestShareEligible),
      createdAtIso: d.createdAt?.toDate?.()?.toISOString?.() ?? undefined,
      paidAtIso: d.paidAt?.toDate?.()?.toISOString?.() ?? undefined,
    } satisfies SerializedAttempt;
  });
}

/** Only the latest paid attempt should remain share-eligible; clears siblings first. */
export async function finalizeAttemptPayment(args: {
  uid: string;
  attemptId: string;
  shareToken: string;
  paymentProvider: NonNullable<SerializedAttempt["paymentProvider"]>;
  paymentId: string;
}): Promise<void> {
  const mine = await listMyAttempts(args.uid);
  for (const row of mine) {
    if (row.id === args.attemptId) continue;
    await patchAttempt(row.id, { isLatestShareEligible: false });
  }
  await patchAttempt(args.attemptId, {
    paymentStatus: "paid",
    paymentProvider: args.paymentProvider,
    paymentId: args.paymentId,
    shareToken: args.shareToken,
    isLatestShareEligible: true,
  });
}
