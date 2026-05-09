import { NextRequest, NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import type { AdminAnalyticsResponse, AdminSiteEventRow } from "@/lib/analytics/admin-types";
import { requireAdmin } from "@/lib/api/admin-auth";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";

function tsMs(v: unknown): number {
  if (v && typeof v === "object") {
    const t = v as Timestamp;
    if (typeof t.toMillis === "function") return t.toMillis();
  }
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const empty = (): AdminAnalyticsResponse => ({
    sampled: 0,
    byKind: {},
    uniqueUids7d: 0,
    uniqueUids30d: 0,
    uniqueSessions7d: 0,
    uniqueSessions30d: 0,
    daily: [],
    topUsers: [],
    recent: [],
  });

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({
      ...empty(),
      degraded: true,
      degradedMessage: firebaseAdminErrorHint(),
    } satisfies AdminAnalyticsResponse);
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(2500, Math.max(50, Number(limitParam) || 900));

  let snap;
  try {
    snap = await db.collection("site_events").orderBy("createdAt", "desc").limit(limit).get();
  } catch (e) {
    if (isFirebaseAdminUnauthenticatedError(e)) {
      return NextResponse.json({
        ...empty(),
        degraded: true,
        degradedMessage: firebaseAdminErrorHint(),
      } satisfies AdminAnalyticsResponse);
    }
    throw e;
  }

  const now = Date.now();
  const d7 = now - 7 * 86400000;
  const d30 = now - 30 * 86400000;

  const byKind: Record<string, number> = {};
  const uids7 = new Set<string>();
  const uids30 = new Set<string>();
  const sess7 = new Set<string>();
  const sess30 = new Set<string>();

  const perUser = new Map<
    string,
    { count: number; last: number; kinds: Record<string, number> }
  >();

  type DayAgg = { uids: Set<string>; sessions: Set<string>; events: number };
  const byDay = new Map<string, DayAgg>();

  const recent: AdminSiteEventRow[] = [];

  snap.docs.forEach((docSnap, idx) => {
    const d = docSnap.data();
    const kind = String(d.kind ?? "unknown");
    const uid = String(d.uid ?? "");
    const sessionId = String(d.sessionId ?? "");
    const path = String(d.path ?? "");
    const label = d.label == null ? null : String(d.label);
    const meta = d.meta && typeof d.meta === "object" ? (d.meta as Record<string, unknown>) : null;

    byKind[kind] = (byKind[kind] ?? 0) + 1;

    const ms = tsMs(d.createdAt) || tsMs(d.clientTs);
    if (ms >= d7 && uid) uids7.add(uid);
    if (ms >= d30 && uid) uids30.add(uid);
    if (ms >= d7 && sessionId) sess7.add(sessionId);
    if (ms >= d30 && sessionId) sess30.add(sessionId);

    if (uid) {
      const cur = perUser.get(uid) ?? { count: 0, last: 0, kinds: {} };
      cur.count++;
      cur.last = Math.max(cur.last, ms);
      cur.kinds[kind] = (cur.kinds[kind] ?? 0) + 1;
      perUser.set(uid, cur);
    }

    if (ms) {
      const day = new Date(ms).toISOString().slice(0, 10);
      let bag = byDay.get(day);
      if (!bag) {
        bag = { uids: new Set(), sessions: new Set(), events: 0 };
        byDay.set(day, bag);
      }
      bag.events++;
      if (uid) bag.uids.add(uid);
      if (sessionId) bag.sessions.add(sessionId);
    }

    if (idx < 120) {
      const iso = ms ? new Date(ms).toISOString() : "";
      recent.push({
        id: docSnap.id,
        kind,
        uid,
        sessionId,
        path,
        label,
        createdAt: iso,
        meta,
      });
    }
  });

  const daily = [...byDay.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((day) => {
      const b = byDay.get(day)!;
      return { day, uniqueUids: b.uids.size, uniqueSessions: b.sessions.size, events: b.events };
    });

  const topUsers = [...perUser.entries()]
    .map(([uid, v]) => ({
      uid,
      eventCount: v.count,
      lastSeen: v.last ? new Date(v.last).toISOString() : "",
      byKind: v.kinds,
    }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 40);

  const body: AdminAnalyticsResponse = {
    sampled: snap.docs.length,
    byKind,
    uniqueUids7d: uids7.size,
    uniqueUids30d: uids30.size,
    uniqueSessions7d: sess7.size,
    uniqueSessions30d: sess30.size,
    daily,
    topUsers,
    recent,
  };

  return NextResponse.json(body);
}
