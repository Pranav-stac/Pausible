import type { AttemptAnswers, AttemptScores } from "@/types/models";
import { getOrCreateLocalUid } from "@/lib/local/uid";

const ATTEMPTS_KEY = "pausible_attempts_v1";

export type SerializedAttempt = {
  id: string;
  uid: string;
  ownerType?: "anonymous" | "google" | "local";
  ownerEmail?: string | null;
  assessmentId: string;
  answers: AttemptAnswers;
  scores?: AttemptScores | null;
  paymentStatus: "pending" | "paid" | "failed";
  paymentProvider?: "stripe" | "razorpay" | "paypal" | "dev" | "free";
  paymentId?: string;
  shareToken?: string | null;
  isLatestShareEligible?: boolean;
  createdAtIso?: string;
  paidAtIso?: string;
};

function readAll(): SerializedAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ATTEMPTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SerializedAttempt[];
  } catch {
    return [];
  }
}

function writeAll(rows: SerializedAttempt[]) {
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(rows));
}

export function localSaveAttempt(partial: Omit<SerializedAttempt, "id"> & { id?: string }): SerializedAttempt {
  const id = partial.id ?? crypto.randomUUID();
  const row: SerializedAttempt = {
    ...partial,
    id,
    createdAtIso: partial.createdAtIso ?? new Date().toISOString(),
  };
  const all = readAll().filter((a) => a.id !== id);
  all.push(row);
  writeAll(all);
  return row;
}

export function localGetAttempt(id: string): SerializedAttempt | null {
  return readAll().find((a) => a.id === id) ?? null;
}

export function localListAttemptsForUser(): SerializedAttempt[] {
  const uid = getOrCreateLocalUid();
  return readAll()
    .filter((a) => a.uid === uid)
    .sort((a, b) => (b.createdAtIso ?? "").localeCompare(a.createdAtIso ?? ""));
}

export function localUpdateAttempt(id: string, patch: Partial<SerializedAttempt>) {
  const all = readAll();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch };
  writeAll(all);
  return all[idx];
}

const SHARE_INDEX = "pausible_share_index_v1";

export function localRegisterShareToken(token: string, attemptId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SHARE_INDEX);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[token] = attemptId;
    window.localStorage.setItem(SHARE_INDEX, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function localResolveShareToken(token: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SHARE_INDEX);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[token] ?? null;
  } catch {
    return null;
  }
}

export function localListAllAttemptsRaw(): SerializedAttempt[] {
  return readAll();
}
