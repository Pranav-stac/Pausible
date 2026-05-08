"use client";

/**
 * Client analytics: Firebase Analytics (GA4) + Firestore `site_events` for the admin console.
 *
 * Firestore rules (merge into your project): authenticated users may create their own rows:
 *
 * match /site_events/{id} {
 *   allow create: if request.auth != null
 *     && request.resource.data.uid == request.auth.uid
 *     && request.resource.data.kind is string
 *     && request.resource.data.kind.size() < 64
 *     && request.resource.data.sessionId is string
 *     && request.resource.data.sessionId.size() < 128
 *     && request.resource.data.path is string
 *     && request.resource.data.path.size() < 512;
 *   allow read, update, delete: if false;
 * }
 */

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { logEvent } from "firebase/analytics";
import { getFirebaseAnalyticsClient, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

const SESSION_KEY = "_ps_sid";
const PV_DEDUPE_PREFIX = "_ps_pv_";

function browserSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return `sess_${Math.random().toString(36).slice(2)}`;
  }
}

function shouldDedupePageView(path: string): boolean {
  const k = `${PV_DEDUPE_PREFIX}${path}`;
  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(k) ?? 0);
    if (now - last < 1600) return true;
    sessionStorage.setItem(k, String(now));
  } catch {
    /* ignore */
  }
  return false;
}

function sanitizeMeta(m?: Record<string, unknown>): Record<string, string | number | boolean> | null {
  if (!m) return null;
  const o: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(m)) {
    if (k.length > 48) continue;
    if (typeof v === "string" && v.length <= 240) o[k] = v;
    else if (typeof v === "number" && Number.isFinite(v)) o[k] = v;
    else if (typeof v === "boolean") o[k] = v;
  }
  return Object.keys(o).length ? o : null;
}

function logGa(eventName: string, params?: Record<string, string | number | boolean>) {
  const a = getFirebaseAnalyticsClient();
  if (!a) return;
  try {
    logEvent(a, eventName, params);
  } catch {
    /* ignore */
  }
}

export async function trackSiteEvent(
  kind: string,
  args: {
    uid: string;
    path: string;
    label?: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const db = getFirebaseDb();
  if (!db) return;
  const meta = sanitizeMeta(args.meta);
  try {
    await addDoc(collection(db, "site_events"), {
      kind: kind.slice(0, 64),
      uid: args.uid,
      sessionId: browserSessionId().slice(0, 120),
      path: args.path.slice(0, 500),
      label: args.label ? args.label.slice(0, 240) : null,
      meta,
      clientTs: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch {
    /* never block UX */
  }
}

export async function trackPageView(path: string, uid: string | null): Promise<void> {
  if (!uid) return;
  if (shouldDedupePageView(path)) return;
  logGa("page_view", { page_path: path, engagement: 1 });
  await trackSiteEvent("page_view", { uid, path, label: document.title });
}

export async function trackCtaAssessment(placement: string, path: string, uid: string | null): Promise<void> {
  if (!uid) return;
  logGa("select_content", { content_type: "cta_assessment", item_id: placement });
  await trackSiteEvent("cta_assessment", { uid, path, label: placement });
}

export async function trackAssessmentStart(args: { uid: string; assessmentId: string; path: string }): Promise<void> {
  logGa("assessment_start", { assessment_id: args.assessmentId });
  await trackSiteEvent("assessment_start", {
    uid: args.uid,
    path: args.path,
    meta: { assessmentId: args.assessmentId },
  });
}

export async function trackAssessmentComplete(args: {
  uid: string;
  assessmentId: string;
  path: string;
  requirePayment: boolean;
}): Promise<void> {
  logGa("assessment_complete", {
    assessment_id: args.assessmentId,
    require_payment: args.requirePayment ? 1 : 0,
  });
  await trackSiteEvent("assessment_complete", {
    uid: args.uid,
    path: args.path,
    meta: { assessmentId: args.assessmentId, requirePayment: args.requirePayment },
  });
}

export async function trackCheckoutOpen(args: { uid: string; attemptId: string; path: string }): Promise<void> {
  logGa("begin_checkout", { attempt_id: args.attemptId.slice(0, 36) });
  await trackSiteEvent("checkout_open", {
    uid: args.uid,
    path: args.path,
    meta: { attemptId: args.attemptId },
  });
}

export async function trackPurchaseComplete(args: {
  uid: string;
  attemptId: string;
  path: string;
  provider: string;
}): Promise<void> {
  logGa("purchase", { transaction_id: args.attemptId.slice(0, 36), payment_type: args.provider });
  await trackSiteEvent("purchase_complete", {
    uid: args.uid,
    path: args.path,
    meta: { attemptId: args.attemptId, provider: args.provider },
  });
}
