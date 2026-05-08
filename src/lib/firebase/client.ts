"use client";

import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import type { Analytics } from "firebase/analytics";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { firebasePublicConfig, isFirebaseConfigured } from "./config";

let app: FirebaseApp | null = null;

function clientFirebaseOptions(): FirebaseOptions {
  const c = firebasePublicConfig;
  const o: FirebaseOptions = {
    apiKey: c.apiKey,
    authDomain: c.authDomain,
    projectId: c.projectId,
    storageBucket: c.storageBucket,
    messagingSenderId: c.messagingSenderId,
    appId: c.appId,
  };
  if (c.measurementId) o.measurementId = c.measurementId;
  return o;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!app && !getApps().length) {
    app = initializeApp(clientFirebaseOptions());
  }
  return app ?? getApps()[0] ?? null;
}

let firebaseAnalytics: Analytics | null | undefined;

/** Returns Analytics when `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` is set; otherwise null. */
export function getFirebaseAnalyticsClient(): Analytics | null {
  if (typeof window === "undefined") return null;
  if (firebaseAnalytics !== undefined) return firebaseAnalytics;
  if (!firebasePublicConfig.measurementId) {
    firebaseAnalytics = null;
    return null;
  }
  const a = getFirebaseApp();
  if (!a) {
    firebaseAnalytics = null;
    return null;
  }
  try {
    firebaseAnalytics = getAnalytics(a);
    return firebaseAnalytics;
  } catch {
    firebaseAnalytics = null;
    return null;
  }
}

export function getFirebaseAuth() {
  const a = getFirebaseApp();
  if (!a) return null;
  return getAuth(a);
}

export function getFirebaseDb() {
  const a = getFirebaseApp();
  if (!a) return null;
  try {
    return initializeFirestore(a, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(a);
  }
}
