import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition, AttemptAnswers } from "@/types/models";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { personaCopy, personaLabel } from "@/lib/results/persona-display";
import { loadPersonaScoringConfigAdmin } from "@/lib/server/persona-config";

export async function markAttemptPaidViaAdmin(input: {
  uid: string;
  attemptId: string;
  paymentProvider: "stripe" | "razorpay" | "paypal";
  paymentId: string;
}) {
  const db = getAdminFirestore();
  if (!db) throw new Error("Admin Firestore not configured");

  const attemptRef = db.collection("attempts").doc(input.attemptId);
  const attemptSnap = await attemptRef.get();
  if (!attemptSnap.exists) throw new Error("Attempt not found");
  const attemptData = attemptSnap.data() ?? {};

  if (String(attemptData.uid) !== input.uid) throw new Error("Attempt does not belong to user");

  const assessmentId = String(attemptData.assessmentId ?? "default");
  const assessmentSnap = await db.collection("assessments").doc(assessmentId).get();
  if (!assessmentSnap.exists) {
    throw new Error(`Assessment "${assessmentId}" missing in Firestore—publish/sync it before fulfilling payment`);
  }
  const assessment = assessmentSnap.data() as AssessmentDefinition;

  const answers = (attemptData.answers ?? {}) as AttemptAnswers;
  const personaConfig = await loadPersonaScoringConfigAdmin();
  const scores =
    attemptData.scores ??
    computeAttemptScores(answers, personaConfig);
  const persona = scores.persona;
  const arch = personaCopy(scores.archetypeKey);
  const primaryLabel = personaLabel(scores.archetypeKey);
  const secondaryLabel = personaLabel(scores.secondaryArchetypeKey);

  const shareToken = crypto.randomBytes(10).toString("hex");

  const siblings = await db.collection("attempts").where("uid", "==", input.uid).get();

  const batch = db.batch();
  siblings.docs.forEach((d) => {
    if (d.id === input.attemptId) return;
    batch.update(d.ref, { isLatestShareEligible: false, updatedAt: FieldValue.serverTimestamp() });
  });

  batch.update(attemptRef, {
    scores,
    personaAnalysis: persona ?? null,
    paymentStatus: "paid",
    paymentProvider: input.paymentProvider,
    paymentId: input.paymentId,
    shareToken,
    paidAt: FieldValue.serverTimestamp(),
    isLatestShareEligible: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(
    db.collection("share_snapshots").doc(shareToken),
    {
      token: shareToken,
      attemptId: input.attemptId,
      uid: input.uid,
      assessmentId,
      assessmentTitle: assessment.title,
      archetypeKey: scores.archetypeKey,
      archetypeLabel: primaryLabel,
      secondaryArchetypeKey: scores.secondaryArchetypeKey,
      secondaryArchetypeLabel: secondaryLabel,
      summary:
        arch?.summary ??
        (persona
          ? `Primary: ${primaryLabel} · Secondary: ${secondaryLabel}`
          : "Your Pausible behavioral snapshot."),
      bullets: arch?.bullets ?? [],
      personaPercentages: persona?.personaPercentages ?? null,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  return { shareToken };
}
