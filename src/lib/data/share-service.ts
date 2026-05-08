"use client";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { getArchetypeCopy } from "@/lib/results/archetype";
import { localRegisterShareToken } from "@/lib/local/attempts";

export type ShareSnapshot = {
  token: string;
  attemptId: string;
  uid: string;
  assessmentId: string;
  assessmentTitle: string;
  archetypeKey?: string;
  archetypeLabel: string;
  summary: string;
  bullets: string[];
};

export async function publishShareSnapshot(
  assessment: AssessmentDefinition,
  attempt: SerializedAttempt,
  token: string,
) {
  const arch = getArchetypeCopy(assessment, attempt.scores?.archetypeKey);

  const payload: ShareSnapshot = {
    token,
    attemptId: attempt.id,
    uid: attempt.uid,
    assessmentId: attempt.assessmentId,
    assessmentTitle: assessment.title,
    archetypeKey: attempt.scores?.archetypeKey,
    archetypeLabel: arch?.label ?? "Your profile",
    summary: arch?.summary ?? "Your latest Pausible behavioral snapshot.",
    bullets: arch?.bullets ?? [],
  };

  localRegisterShareToken(token, attempt.id);

  const canWriteShareToFirestore =
    isFirebaseConfigured() && getFirebaseAuth()?.currentUser != null;
  if (!canWriteShareToFirestore) return;

  const db = getFirebaseDb();
  if (!db) return;

  await setDoc(
    doc(db, "share_snapshots", token),
    {
      ...payload,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
}
