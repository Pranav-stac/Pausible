"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { ProfileAgeRange, ProfileGender } from "@/lib/profile/demographics-options";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchGooglePeopleDemographics } from "@/lib/firebase/google-people-profile";

export type DemographicsSource = "google" | "manual";

export type StoredUserDemographics = {
  ageRange?: ProfileAgeRange;
  dateOfBirth?: string;
  gender?: ProfileGender;
  demographicsSource?: DemographicsSource;
};

export async function loadUserDemographics(uid: string): Promise<StoredUserDemographics | null> {
  if (!isFirebaseConfigured()) return null;

  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ageRange: typeof data.ageRange === "string" ? (data.ageRange as ProfileAgeRange) : undefined,
      dateOfBirth: typeof data.dateOfBirth === "string" ? data.dateOfBirth : undefined,
      gender: typeof data.gender === "string" ? (data.gender as ProfileGender) : undefined,
      demographicsSource:
        data.demographicsSource === "google" || data.demographicsSource === "manual"
          ? data.demographicsSource
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveUserDemographics(
  uid: string,
  demographics: StoredUserDemographics,
): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  if (!db) return;

  try {
    await setDoc(
      doc(db, "users", uid),
      {
        ageRange: demographics.ageRange ?? null,
        dateOfBirth: demographics.dateOfBirth ?? null,
        gender: demographics.gender ?? null,
        demographicsSource: demographics.demographicsSource ?? "manual",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    /* best-effort */
  }
}

/** Best-effort: read birthday/gender from Google People API and persist when present. */
export async function enrichUserDemographicsFromGoogle(user: User, accessToken: string | null | undefined): Promise<void> {
  if (!accessToken || user.isAnonymous) return;

  const existing = await loadUserDemographics(user.uid);
  if (existing?.demographicsSource === "manual" && existing.ageRange && existing.gender) return;

  const fromGoogle = await fetchGooglePeopleDemographics(accessToken);
  if (!fromGoogle.ageRange && !fromGoogle.gender && !fromGoogle.dateOfBirth) return;

  await saveUserDemographics(user.uid, {
    ageRange: existing?.ageRange ?? fromGoogle.ageRange,
    dateOfBirth: existing?.dateOfBirth ?? fromGoogle.dateOfBirth,
    gender: existing?.gender ?? fromGoogle.gender,
    demographicsSource: "google",
  });
}
