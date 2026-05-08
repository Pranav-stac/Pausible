"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/** Upsert `users/{uid}` whenever someone signs in (anonymous or federated). */
export async function syncUserProfile(user: User): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const db = getFirebaseDb();
  if (!db) return;

  await setDoc(
    doc(db, "users", user.uid),
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      isAnonymous: user.isAnonymous,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
