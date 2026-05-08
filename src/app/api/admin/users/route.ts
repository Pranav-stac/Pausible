import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const auth = getAdminAuth();
  if (!auth) return NextResponse.json({ items: [], note: "Configure admin SDK" });

  const max = Math.min(500, Math.max(10, Number(req.nextUrl.searchParams.get("max") ?? "100")));
  const res = await auth.listUsers(max);
  const uids = res.users.map((u) => u.uid);

  const db = getAdminFirestore();
  const firestoreByUid: Record<
    string,
    { role?: string | null; profileUpdatedAt?: string | null }
  > = {};

  const attemptsByUid = new Map<string, number>();

  if (db) {
    try {
      const recent = await db.collection("attempts").orderBy("createdAt", "desc").limit(2500).get();
      recent.forEach((d) => {
        const uid = String(d.data().uid ?? "");
        if (uid) attemptsByUid.set(uid, (attemptsByUid.get(uid) ?? 0) + 1);
      });
    } catch {
      /* index or empty */
    }

    const chunk = 100;
    for (let i = 0; i < uids.length; i += chunk) {
      const slice = uids.slice(i, i + chunk);
      const refs = slice.map((uid) => db.collection("users").doc(uid));
      try {
        const snaps = await db.getAll(...refs);
        snaps.forEach((s) => {
          if (!s.exists) return;
          const d = s.data() ?? {};
          const role = typeof d.role === "string" ? d.role : null;
          const updated = d.updatedAt?.toDate?.()?.toISOString?.() ?? null;
          firestoreByUid[s.id] = { role, profileUpdatedAt: updated };
        });
      } catch {
        /* ignore */
      }
    }
  }

  const items = res.users.map((u) => ({
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    disabled: u.disabled,
    emailVerified: u.emailVerified,
    createdAt: u.metadata.creationTime,
    lastSignIn: u.metadata.lastSignInTime ?? null,
    isAnonymous: !(u.email || u.providerData?.length),
    firestoreRole: firestoreByUid[u.uid]?.role ?? null,
    isAdmin: firestoreByUid[u.uid]?.role === "admin",
    profileUpdatedAt: firestoreByUid[u.uid]?.profileUpdatedAt ?? null,
    recentAttemptCount: attemptsByUid.get(u.uid) ?? 0,
  }));

  return NextResponse.json({ items });
}
