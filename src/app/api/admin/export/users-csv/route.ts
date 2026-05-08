import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-auth";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/server";

function esc(c: string) {
  if (c.includes(",") || c.includes('"') || c.includes("\n")) {
    return `"${c.replace(/"/g, '""')}"`;
  }
  return c;
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const auth = getAdminAuth();
  if (!auth) return NextResponse.json({ error: "Auth admin missing" }, { status: 503 });

  const max = Math.min(1000, Math.max(10, Number(req.nextUrl.searchParams.get("max") ?? "500")));
  const list = await auth.listUsers(max);
  const db = getAdminFirestore();

  const fsRole = new Map<string, string | null>();
  const fsUpdated = new Map<string, string>();
  const attemptsN = new Map<string, number>();

  if (db) {
    try {
      const recent = await db.collection("attempts").orderBy("createdAt", "desc").limit(3000).get();
      recent.forEach((d) => {
        const uid = String(d.data().uid ?? "");
        if (uid) attemptsN.set(uid, (attemptsN.get(uid) ?? 0) + 1);
      });
    } catch {
      /* empty */
    }

    for (let i = 0; i < list.users.length; i += 100) {
      const slice = list.users.slice(i, i + 100);
      const refs = slice.map((u) => db.collection("users").doc(u.uid));
      try {
        const snaps = await db.getAll(...refs);
        snaps.forEach((s) => {
          if (!s.exists) return;
          const d = s.data() ?? {};
          fsRole.set(s.id, typeof d.role === "string" ? d.role : null);
          fsUpdated.set(s.id, d.updatedAt?.toDate?.()?.toISOString?.() ?? "");
        });
      } catch {
        /* ignore */
      }
    }
  }

  const header = [
    "uid",
    "email",
    "display_name",
    "disabled",
    "email_verified",
    "is_anonymous",
    "auth_created",
    "last_sign_in",
    "firestore_role",
    "profile_updated",
    "recent_attempts_sample",
  ].join(",");

  const lines = list.users.map((u) => {
    const row = [
      u.uid,
      u.email ?? "",
      u.displayName ?? "",
      u.disabled ? "yes" : "no",
      u.emailVerified ? "yes" : "no",
      !(u.email || u.providerData?.length) ? "yes" : "no",
      u.metadata.creationTime ?? "",
      u.metadata.lastSignInTime ?? "",
      fsRole.get(u.uid) ?? "",
      fsUpdated.get(u.uid) ?? "",
      String(attemptsN.get(u.uid) ?? 0),
    ].map((s) => esc(s));
    return row.join(",");
  });

  const body = [header, ...lines].join("\n");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pausible-users.csv"',
    },
  });
}
