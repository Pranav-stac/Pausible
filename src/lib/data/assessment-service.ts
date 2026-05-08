"use client";

import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { defaultAssessmentId } from "@/data/default-assessment";
import type { AssessmentDefinition } from "@/types/models";

/**
 * Load exactly one assessment from Firestore (`assessments/{id}`).
 * No bundled JSON fallback—the doc must exist in your project database.
 */
export async function fetchAssessment(id: string = defaultAssessmentId): Promise<AssessmentDefinition | null> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Assessments are loaded from Firestore only. Configure NEXT_PUBLIC_FIREBASE_* keys in .env.local.",
    );
  }
  const db = getFirebaseDb();
  if (!db) {
    throw new Error(
      "Firestore client is unavailable. Check Firebase initialization and authorized domains for this app.",
    );
  }

  const snap = await getDoc(doc(db, "assessments", id));
  if (!snap.exists()) return null;

  const data = snap.data() as AssessmentDefinition;
  if (data.active === false) return null;

  return { ...data, id: snap.id };
}

export type AssessmentListItem = {
  id: string;
  title: string;
  description?: string;
};

/** Active assessments for picker — Firestore only; empty if unconfigured or no published docs */
export async function listActiveAssessmentSummaries(): Promise<AssessmentListItem[]> {
  if (!isFirebaseConfigured() || !getFirebaseDb()) return [];

  const db = getFirebaseDb();
  if (!db) return [];

  const snap = await getDocs(collection(db, "assessments"));
  const rows = snap.docs
    .map((s) => {
      const data = s.data() as AssessmentDefinition;
      return { ...data, id: s.id };
    })
    .filter((a) => a.active !== false)
    .map((a) => ({
      id: a.id,
      title: a.title || a.id,
      description: a.description,
    }));

  rows.sort((a, b) => a.title.localeCompare(b.title));
  return rows;
}
