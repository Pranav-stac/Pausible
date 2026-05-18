"use client";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { personaCopy, personaLabel } from "@/lib/results/persona-display";
import { dimensionRowsForAttempt } from "@/lib/results/dimension-rows";
import { localRegisterShareToken } from "@/lib/local/attempts";

export type ShareDimensionBar = { key: string; label: string; pct: number };

export type ShareSnapshot = {
  token: string;
  attemptId: string;
  uid: string;
  assessmentId: string;
  assessmentTitle: string;
  archetypeKey?: string;
  archetypeLabel: string;
  secondaryArchetypeKey?: string;
  secondaryArchetypeLabel?: string;
  summary: string;
  bullets: string[];
  dimensionBars?: ShareDimensionBar[];
};

export async function publishShareSnapshot(
  assessment: AssessmentDefinition,
  attempt: SerializedAttempt,
  token: string,
) {
  const arch = personaCopy(attempt.scores?.archetypeKey);
  const primaryLabel = personaLabel(attempt.scores?.archetypeKey);
  const secondaryLabel = personaLabel(attempt.scores?.secondaryArchetypeKey);

  const dimensionBars = dimensionRowsForAttempt(assessment, attempt).slice(0, 6);

  const payload: ShareSnapshot = {
    token,
    attemptId: attempt.id,
    uid: attempt.uid,
    assessmentId: attempt.assessmentId,
    assessmentTitle: assessment.title,
    archetypeKey: attempt.scores?.archetypeKey,
    archetypeLabel: primaryLabel,
    secondaryArchetypeKey: attempt.scores?.secondaryArchetypeKey,
    secondaryArchetypeLabel: secondaryLabel,
    summary:
      arch?.summary ??
      (attempt.scores?.secondaryArchetypeKey
        ? `Primary: ${primaryLabel} · Secondary: ${secondaryLabel}`
        : "Your latest Pausible behavioral snapshot."),
    bullets: arch?.bullets ?? [],
    ...(dimensionBars.length ? { dimensionBars } : {}),
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
