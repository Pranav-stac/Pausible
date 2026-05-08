"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import type { AssessmentDefinition } from "@/types/models";
import { AssessmentUiEditor } from "@/components/admin/AssessmentUiEditor";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import type { AdminAnalyticsResponse } from "@/lib/analytics/admin-types";

type Tab = "overview" | "attempts" | "assessments" | "users" | "analytics" | "settings";

type Stats = {
  attemptCount: number;
  paidCount: number;
  pendingCount: number;
  uniqueUsers: number;
  byAssessment: Record<string, number>;
  byProvider: Record<string, number>;
  last30Days: { day: string; count: number; paid: number; pending: number }[];
};

type AttemptRow = {
  id: string;
  uid: string;
  assessmentId: string;
  paymentStatus: string;
  paymentProvider: string | null;
  paymentId: string | null;
  shareToken: string | null;
  isLatestShareEligible: boolean;
  createdAt: string | null;
  paidAt: string | null;
  answerCount: number;
  archetypeKey: string | null;
};

type UserRow = {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastSignIn: string | null;
  isAnonymous: boolean;
  firestoreRole: string | null;
  isAdmin: boolean;
  profileUpdatedAt: string | null;
  recentAttemptCount: number;
};

type AssessmentRow = {
  id: string;
  title: string;
  active: boolean;
  questionCount: number;
  updatedAt: string | null;
};

async function getBearer(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const u = auth?.currentUser;
  if (!u) return null;
  return u.getIdToken();
}

function firestoreJsonReplacer(_key: string, value: unknown) {
  if (value && typeof value === "object") {
    const o = value as { toDate?: () => Date };
    if (typeof o.toDate === "function") {
      try {
        return o.toDate().toISOString();
      } catch {
        return String(value);
      }
    }
  }
  return value;
}

export function AdminDashboard() {
  const router = useRouter();
  const { user, ready: authReady, signInWithGoogle, linkGoogle, signOut } = useFirebaseAuth();
  const hasGoogleIdentity = Boolean(user && !user.isAnonymous && user.email);
  const firebaseOn = isFirebaseConfigured();
  const canLoadAdminData = firebaseOn && authReady && hasGoogleIdentity;

  const [tab, setTab] = useState<Tab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [assessRows, setAssessRows] = useState<AssessmentRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requirePayment, setRequirePayment] = useState(true);
  const [priceInrDraft, setPriceInrDraft] = useState("499");
  const [envDefaultPriceInr, setEnvDefaultPriceInr] = useState(499);

  const [analyticsData, setAnalyticsData] = useState<AdminAnalyticsResponse | null>(null);
  const [analyticsBusy, setAnalyticsBusy] = useState(false);

  const [editorId, setEditorId] = useState<string | null>(null);
  const [editorJson, setEditorJson] = useState("");
  const [editorMode, setEditorMode] = useState<"json" | "ui">("ui");
  const [uiDraft, setUiDraft] = useState<AssessmentDefinition | null>(null);

  const [attemptDrawerId, setAttemptDrawerId] = useState<string | null>(null);
  const [attemptDrawer, setAttemptDrawer] = useState<Record<string, unknown> | null>(null);

  const handleAdminLogout = useCallback(async () => {
    await signOut();
    router.push("/");
  }, [router, signOut]);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    setErr(null);
    const token = await getBearer();
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(path, { ...init, headers });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        reason?: string;
        hint?: string;
        tokenUid?: string;
      };
      const base = j.error ?? `Request failed (${res.status})`;
      if (res.status === 403) {
        throw new Error(
          [base, `(${res.status})`, j.reason && `reason=${j.reason}`, j.tokenUid && `tokenUid=${j.tokenUid}`, j.hint]
            .filter(Boolean)
            .join(" — "),
        );
      }
      throw new Error(base);
    }
    return res;
  }, []);

  const downloadBlob = useCallback(async (url: string, filename: string) => {
    const token = await getBearer();
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? "Download failed");
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  }, []);

  const refreshStats = useCallback(async () => {
    const res = await api("/api/admin/stats");
    setStats((await res.json()) as Stats);
  }, [api]);

  const refreshAttempts = useCallback(async () => {
    const res = await api("/api/admin/attempts?limit=200");
    const j = (await res.json()) as { items: AttemptRow[] };
    setAttempts(j.items);
  }, [api]);

  const refreshAssessments = useCallback(async () => {
    const res = await api("/api/admin/assessments");
    const j = (await res.json()) as { items: AssessmentRow[] };
    setAssessRows(j.items);
  }, [api]);

  const refreshUsers = useCallback(async () => {
    const res = await api("/api/admin/users?max=200");
    const j = (await res.json()) as { items: UserRow[] };
    setUsers(j.items);
  }, [api]);

  const refreshSettingsRemote = useCallback(async () => {
    const res = await api("/api/admin/settings");
    const j = (await res.json()) as { requirePayment: boolean; priceInr: number; envDefaultPriceInr?: number };
    setRequirePayment(j.requirePayment);
    setPriceInrDraft(String(j.priceInr));
    if (typeof j.envDefaultPriceInr === "number") setEnvDefaultPriceInr(j.envDefaultPriceInr);
  }, [api]);

  const refreshAnalytics = useCallback(async () => {
    setAnalyticsBusy(true);
    try {
      const res = await api("/api/admin/analytics?limit=1200");
      setAnalyticsData((await res.json()) as AdminAnalyticsResponse);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setAnalyticsBusy(false);
    }
  }, [api]);

  useEffect(() => {
    if (!canLoadAdminData) return;
    void (async () => {
      try {
        await refreshStats();
        await refreshAttempts();
        await refreshAssessments();
        await refreshUsers();
        await refreshSettingsRemote();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load admin data");
      }
    })();
  }, [canLoadAdminData, refreshAssessments, refreshAttempts, refreshSettingsRemote, refreshStats, refreshUsers]);

  useEffect(() => {
    if (tab !== "analytics" || !canLoadAdminData) return;
    queueMicrotask(() => void refreshAnalytics());
  }, [tab, canLoadAdminData, refreshAnalytics]);

  useEffect(() => {
    if (!attemptDrawerId || !canLoadAdminData) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getBearer();
        const res = await fetch(`/api/admin/attempts/${encodeURIComponent(attemptDrawerId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!cancelled && res.ok) setAttemptDrawer(j);
        else if (!cancelled) setAttemptDrawer(null);
      } catch {
        if (!cancelled) setAttemptDrawer(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptDrawerId, canLoadAdminData]);

  useEffect(() => {
    if (attemptDrawerId) return;
    queueMicrotask(() => setAttemptDrawer(null));
  }, [attemptDrawerId]);

  const downloadExport = useCallback(async () => {    setMsg(null);
    setErr(null);
    try {
      await downloadBlob("/api/admin/export", "pausible-export.xlsx");
      setMsg("Full workbook exported.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    }
  }, [downloadBlob]);

  const downloadAttemptsCsv = useCallback(async () => {
    setErr(null);
    try {
      await downloadBlob("/api/admin/export/attempts-csv?limit=5000", "pausible-attempts.csv");
      setMsg("Attempts CSV exported.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    }
  }, [downloadBlob]);

  const downloadUsersCsv = useCallback(async () => {
    setErr(null);
    try {
      await downloadBlob("/api/admin/export/users-csv?max=800", "pausible-users.csv");
      setMsg("Users CSV exported.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    }
  }, [downloadBlob]);

  const patchSettings = useCallback(
    async (next: boolean) => {
      try {
        await api("/api/admin/settings", {
          method: "PATCH",
          body: JSON.stringify({ requirePayment: next }),
        });
        setRequirePayment(next);
        await refreshSettingsRemote();
        setMsg(next ? "Payments required again." : "Free results enabled for new runs.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Save failed");
      }
    },
    [api, refreshSettingsRemote],
  );

  const saveAssessmentPriceInr = useCallback(async () => {
    const n = Number.parseInt(String(priceInrDraft).replace(/\s/g, ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > 500_000) {
      setErr("Price must be a whole number between 1 and 500,000 INR.");
      return;
    }
    setErr(null);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ priceInr: n }),
      });
      setMsg("Assessment list price updated.");
      await refreshSettingsRemote();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }, [api, priceInrDraft, refreshSettingsRemote]);

  const resetPriceToEnvDefault = useCallback(async () => {
    setErr(null);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ priceInr: null }),
      });
      setMsg("Stored price removed — checkouts use your .env default until you set a price again.");
      await refreshSettingsRemote();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    }
  }, [api, refreshSettingsRemote]);

  const seedDefault = useCallback(async () => {
    try {
      await api("/api/admin/assessments/seed", { method: "POST" });
      setMsg("Synced default from question.json.");
      await refreshAssessments();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Seed failed");
    }
  }, [api, refreshAssessments]);

  const toggleAssessment = useCallback(
    async (id: string, active: boolean) => {
      try {
        await api(`/api/admin/assessments/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ active }),
        });
        await refreshAssessments();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Update failed");
      }
    },
    [api, refreshAssessments],
  );

  const openEditorJson = useCallback(async (id: string) => {
    setErr(null);
    setEditorId(id);
    setEditorMode("json");
    setUiDraft(null);
    if (!isFirebaseConfigured()) {
      setEditorJson("// Enable Firebase");
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setEditorJson("// Firestore unavailable");
      return;
    }
    const snap = await getDoc(doc(db, "assessments", id));
    if (!snap.exists()) {
      setEditorJson("{}");
      return;
    }
    setEditorJson(JSON.stringify(snap.data(), firestoreJsonReplacer, 2));
  }, []);

  const openEditorUi = useCallback(async (id: string) => {
    setErr(null);
    setEditorId(id);
    setEditorMode("ui");
    if (!isFirebaseConfigured()) {
      setUiDraft(null);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setUiDraft(null);
      return;
    }
    const snap = await getDoc(doc(db, "assessments", id));
    if (!snap.exists()) {
      setUiDraft(null);
      return;
    }
    const data = snap.data() as AssessmentDefinition;
    const qCount = data.questions && typeof data.questions === "object" ? Object.keys(data.questions).length : 0;
    const safe: AssessmentDefinition = {
      ...data,
      id: snap.id,
      sections: Array.isArray(data.sections) ? data.sections : [],
      questions: qCount ? data.questions : {},
      interpretation: data.interpretation ?? { archetypes: [] },
    };
    setUiDraft(safe);
    setEditorJson(JSON.stringify(snap.data(), firestoreJsonReplacer, 2));
  }, []);

  const createBlankAssessment = useCallback(async () => {
    try {
      const res = await api("/api/admin/assessments", {
        method: "POST",
        body: JSON.stringify({ createMinimal: true, title: "New assessment" }),
      });
      const j = (await res.json()) as { id: string };
      setMsg(`Created assessment ${j.id}. Open it in the visual editor.`);
      await refreshAssessments();
      void openEditorUi(j.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    }
  }, [api, openEditorUi, refreshAssessments]);

  const saveEditorJson = useCallback(async () => {
    if (!editorId) return;
    try {
      const parsed = JSON.parse(editorJson) as Record<string, unknown>;
      await api(`/api/admin/assessments/${encodeURIComponent(editorId)}`, {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      setMsg("Assessment saved (JSON).");
      await refreshAssessments();
      if (editorMode === "ui") await openEditorUi(editorId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invalid JSON or save failed");
    }
  }, [api, editorId, editorJson, editorMode, openEditorUi, refreshAssessments]);

  const saveEditorUi = useCallback(async () => {
    if (!editorId || !uiDraft) return;
    try {
      const payload = { ...uiDraft, id: editorId };
      await api(`/api/admin/assessments/${encodeURIComponent(editorId)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMsg("Assessment saved (visual editor).");
      await refreshAssessments();
      await openEditorUi(editorId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }, [api, editorId, openEditorUi, refreshAssessments, uiDraft]);

  const importFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as unknown;
        const assessments = Array.isArray(data) ? data : [data];
        await api("/api/admin/assessments/import", {
          method: "POST",
          body: JSON.stringify({ assessments }),
        });
        setMsg(`Imported ${assessments.length} assessment(s).`);
        await refreshAssessments();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Import failed");
      }
    },
    [api, refreshAssessments],
  );

  const setUserAdmin = useCallback(
    async (uid: string, asAdmin: boolean) => {
      try {
        await api(`/api/admin/firestore-users/${encodeURIComponent(uid)}`, {
          method: "PATCH",
          body: JSON.stringify({ role: asAdmin ? "admin" : null }),
        });
        setMsg(asAdmin ? "User promoted to admin." : "Admin role removed.");
        await refreshUsers();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Role update failed");
      }
    },
    [api, refreshUsers],
  );

  const maxDay = useMemo(() => {
    if (!stats?.last30Days?.length) return 1;
    return Math.max(1, ...stats.last30Days.map((d) => d.count));
  }, [stats]);

  const funnelPct = useMemo(() => {
    if (!stats || !stats.attemptCount) return { paid: 0, pend: 0 };
    return {
      paid: Math.round((stats.paidCount / stats.attemptCount) * 100),
      pend: Math.round((stats.pendingCount / stats.attemptCount) * 100),
    };
  }, [stats]);

  const uidEmail = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) {
      if (u.email) m.set(u.uid, u.email);
    }
    return m;
  }, [users]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-16 text-center text-sm text-slate-500 sm:px-4">Loading…</div>
    );
  }

  if (!firebaseOn) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-10 sm:px-4">
        <div className="mx-auto max-w-lg space-y-4">
          <Link href="/" className="text-sm font-semibold text-sky-700">
            ← Site
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
          <p className="text-sm text-slate-600">
            Set <code className="rounded bg-slate-100 px-1 text-xs">NEXT_PUBLIC_FIREBASE_*</code> to use the console.
          </p>
        </div>
      </div>
    );
  }

  if (!hasGoogleIdentity) {
    return (
      <div className="min-h-screen bg-slate-50 px-3 py-10 sm:px-4">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Link href="/" className="text-sm font-semibold text-sky-700">
            ← Site
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Admin sign-in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with Google. <strong>Forbidden</strong> after that means your Firestore{" "}
            <code className="text-xs">users/&lt;uid&gt;.role</code> is not{" "}
            <code className="text-xs">&quot;admin&quot;</code>.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Sign in with Google
            </button>
            {user?.isAnonymous ? (
              <button
                type="button"
                onClick={() => void linkGoogle()}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
              >
                Link Google
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(17rem,92vw)] max-w-none shrink-0 transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:shadow-none ${
          mobileNavOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <AdminSidebar
          tab={tab}
          onTab={(t) => setTab(t as Tab)}
          onExportMenu={() => setTab("settings")}
          onAfterNavigate={() => setMobileNavOpen(false)}
          onLogout={() => void handleAdminLogout()}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-screen">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
            <button
              type="button"
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm lg:hidden"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <Link href="/" className="text-xs font-semibold text-sky-700">
                ← Site
              </Link>
              <h1 className="text-lg font-semibold tracking-tight">Admin console</h1>
            </div>
          </div>
          <div className="flex max-w-[100vw] gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => void downloadAttemptsCsv()}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              CSV attempts
            </button>
            <button
              type="button"
              onClick={() => void downloadUsersCsv()}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              CSV users
            </button>
            <button
              type="button"
              onClick={() => void downloadExport()}
              className="shrink-0 rounded-lg bg-linear-to-r from-violet-600 to-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Workbook
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-4 lg:p-6">
          {msg ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-900">{msg}</p> : null}
          {err ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-800">{err}</p> : null}

          {tab === "overview" && stats ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Attempts (sample)", stats.attemptCount, "text-slate-900"],
                  ["Paid", stats.paidCount, "text-emerald-700"],
                  ["Pending pay", stats.pendingCount, "text-amber-700"],
                  ["Unique UIDs", stats.uniqueUsers, "text-sky-800"],
                ].map(([label, n, cls]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                    <div className={`mt-2 text-3xl font-semibold tabular-nums ${cls}`}>{n as number}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">30-day volume (UTC)</h2>
                    <span className="text-[10px] text-slate-500">stacked paid / pending</span>
                  </div>
                  <div className="mt-4 flex h-52 items-end gap-px">
                    {stats.last30Days.map((d) => {
                      const hTotal = Math.max(6, Math.round((d.count / maxDay) * 180));
                      const hp = d.count ? Math.round((d.paid / d.count) * hTotal) : 0;
                      const hpe = hTotal - hp;
                      return (
                        <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                          <div
                            className="flex w-full max-w-[14px] flex-col justify-end overflow-hidden rounded-t bg-slate-100"
                            style={{ height: 180 }}
                            title={`${d.day} total ${d.count} · paid ${d.paid} · pending ${d.pending}`}
                          >
                            <div className="w-full bg-emerald-500" style={{ height: hp }} />
                            <div className="w-full bg-amber-400" style={{ height: hpe }} />
                          </div>
                          <span className="hidden text-[8px] text-slate-400 sm:inline">{d.day.slice(8)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-semibold">Payment mix</h2>
                  <div
                    className="mx-auto mt-6 size-40 rounded-full border-4 border-white shadow-inner"
                    style={{
                      background: `conic-gradient(rgb(16 185 129) 0 ${funnelPct.paid}%, rgb(251 191 36) ${funnelPct.paid}% ${
                        funnelPct.paid + funnelPct.pend
                      }%, rgb(226 232 240) ${funnelPct.paid + funnelPct.pend}% 100%)`,
                    }}
                    title={`Paid ${funnelPct.paid}% · Pending ${funnelPct.pend}%`}
                  />
                  <div className="mt-4 flex justify-center gap-4 text-xs">
                    <span className="flex items-center gap-1 font-medium">
                      <span className="size-2 rounded-full bg-emerald-500" /> Paid {funnelPct.paid}%
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <span className="size-2 rounded-full bg-amber-400" /> Pending {funnelPct.pend}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-semibold">Payments by provider</h2>
                  <div className="mt-4 space-y-2">
                    {Object.entries(stats.byProvider)
                      .sort((a, b) => b[1] - a[1])
                      .map(([prov, count]) => (
                        <div key={prov}>
                          <div className="flex justify-between text-xs font-semibold text-slate-600">
                            <span>{prov}</span>
                            <span>{count}</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-indigo-500 to-sky-500"
                              style={{
                                width: `${Math.min(100, Math.round((count / (stats.attemptCount || 1)) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-semibold">Assessment usage</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(stats.byAssessment).map(([k, v]) => (
                      <span key={k} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "attempts" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Recent attempts</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshAttempts()}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadAttemptsCsv()}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full min-w-[1100px] text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Attempt</th>
                        <th className="px-3 py-2">User</th>
                        <th className="px-3 py-2">Assessment</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Answers</th>
                        <th className="px-3 py-2">Archetype</th>
                        <th className="px-3 py-2">Provider</th>
                        <th className="px-3 py-2">Share</th>
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {attempts.map((row) => (
                        <tr
                          key={row.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setAttemptDrawerId(row.id)}
                          onKeyDown={(e) =>
                            e.key === "Enter" || e.key === " " ? (e.preventDefault(), setAttemptDrawerId(row.id)) : null
                          }
                          className="cursor-pointer border-t border-slate-100 hover:bg-sky-50/60"
                        >
                          <td className="px-3 py-2 font-mono text-[11px]">{row.id.slice(0, 12)}…</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{row.uid.slice(0, 10)}…</td>
                          <td className="px-3 py-2">{row.assessmentId}</td>
                          <td className="px-3 py-2 font-semibold">{row.paymentStatus}</td>
                          <td className="px-3 py-2 tabular-nums">{row.answerCount}</td>
                          <td className="px-3 py-2 text-[11px]">{row.archetypeKey ?? "—"}</td>
                          <td className="px-3 py-2">{row.paymentProvider ?? "—"}</td>
                          <td className="px-3 py-2 text-[10px]">{row.shareToken?.slice(0, 8) ?? "—"}</td>
                          <td className="px-3 py-2 text-[10px] text-slate-500">{row.createdAt?.slice(0, 16) ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {tab === "assessments" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void createBlankAssessment()}
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  + New assessment
                </button>
                <button
                  type="button"
                  onClick={() => void seedDefault()}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold"
                >
                  Sync default (question.json)
                </button>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold">
                  Import JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => void importFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void downloadExport()}
                  className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Export workbook
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">ID</th>
                      <th className="px-4 py-2">Qs</th>
                      <th className="px-4 py-2">State</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-semibold">{row.title}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.id}</td>
                        <td className="px-4 py-2 tabular-nums">{row.questionCount}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => void toggleAssessment(row.id, !row.active)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              row.active ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {row.active ? "Active" : "Paused"}
                          </button>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void openEditorUi(row.id)}
                              className="text-xs font-semibold text-sky-700"
                            >
                              Visual editor
                            </button>
                            <button
                              type="button"
                              onClick={() => void openEditorJson(row.id)}
                              className="text-xs font-semibold text-slate-600"
                            >
                              JSON
                            </button>
                            <Link
                              href={`/assessment/${encodeURIComponent(row.id)}`}
                              target="_blank"
                              className="text-xs font-semibold text-indigo-600"
                            >
                              Preview
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editorId ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h3 className="font-mono text-sm font-semibold">{editorId}</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditorMode("ui")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${editorMode === "ui" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
                      >
                        Visual
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode("json")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${editorMode === "json" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
                      >
                        JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEditorUi()}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save visual
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveEditorJson()}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save JSON
                      </button>
                      <button type="button" onClick={() => setEditorId(null)} className="text-xs font-semibold text-slate-500">
                        Close
                      </button>
                    </div>
                  </div>
                  {editorMode === "json" ? (
                    <textarea
                      value={editorJson}
                      onChange={(e) => setEditorJson(e.target.value)}
                      rows={14}
                      spellCheck={false}
                      className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
                    />
                  ) : uiDraft ? (
                    <div className="mt-4 max-h-[70vh] overflow-y-auto">
                      <AssessmentUiEditor draft={uiDraft} onChange={setUiDraft} />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Loading visual model… Use JSON tab if this hangs.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "users" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">People</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void refreshUsers()} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">
                    Refresh
                  </button>
                  <button type="button" onClick={() => void downloadUsersCsv()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="max-h-[600px] overflow-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Recent attempts*</th>
                        <th className="px-3 py-2">Last sign-in</th>
                        <th className="px-3 py-2">Profile sync</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {users.map((u) => (
                        <tr key={u.uid} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2">{u.email ?? "—"}</td>
                          <td className="px-3 py-2">{u.displayName ?? "—"}</td>
                          <td className="px-3 py-2">
                            {u.isAdmin ? (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-900">admin</span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{u.recentAttemptCount}</td>
                          <td className="px-3 py-2 text-slate-500">{u.lastSignIn?.slice(0, 16) ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{u.profileUpdatedAt?.slice(0, 16) ?? "—"}</td>
                          <td className="px-3 py-2">
                            {u.isAdmin ? (
                              <button
                                type="button"
                                onClick={() => void setUserAdmin(u.uid, false)}
                                className="font-semibold text-amber-800"
                              >
                                Remove admin
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void setUserAdmin(u.uid, true)}
                                className="font-semibold text-sky-700"
                              >
                                Make admin
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-slate-100 px-3 py-2 text-[10px] text-slate-500">
                  *Recent attempts = count in last ~2.5k attempts sample (fast proxy for activity).
                </p>
              </div>
            </div>
          ) : null}

          {tab === "analytics" ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Firestore <code className="rounded bg-slate-100 px-1">site_events</code> + Firebase Analytics (GA). Add{" "}
                    <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID</code> for GA. Allow
                    authenticated creates on <code className="rounded bg-slate-100 px-1">site_events</code> in Firestore
                    rules (see <code className="rounded bg-slate-100 px-1">track.ts</code> comment).
                  </p>
                </div>
                <button
                  type="button"
                  disabled={analyticsBusy}
                  onClick={() => void refreshAnalytics()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
                >
                  {analyticsBusy ? "Loading…" : "Refresh"}
                </button>
              </div>

              {!analyticsData && analyticsBusy ? (
                <p className="text-sm text-slate-500">Loading event sample…</p>
              ) : !analyticsData ? (
                <p className="text-sm text-slate-500">No data yet.</p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["Events (sample)", analyticsData.sampled],
                      ["Visitor sessions · 7d", analyticsData.uniqueSessions7d],
                      ["Signed-in IDs · 7d", analyticsData.uniqueUids7d],
                      ["Sessions · 30d", analyticsData.uniqueSessions30d],
                      ["Signed-in IDs · 30d", analyticsData.uniqueUids30d],
                    ].map(([label, n]) => (
                      <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                        <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{n as number}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900">By event type</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(analyticsData.byKind)
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, count]) => (
                          <span
                            key={k}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-800"
                          >
                            {k}{" "}
                            <strong className="tabular-nums text-sky-800">{count}</strong>
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-900">Top users (event volume in sample)</h3>
                    </div>
                    <div className="max-h-[320px] overflow-auto">
                      <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2">UID</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2 tabular-nums">Events</th>
                            <th className="px-3 py-2">Last seen</th>
                            <th className="px-3 py-2">Mix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.topUsers.map((row) => (
                            <tr key={row.uid} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{row.uid.slice(0, 12)}…</td>
                              <td className="px-3 py-2 text-slate-600">{uidEmail.get(row.uid) ?? "—"}</td>
                              <td className="px-3 py-2 tabular-nums font-semibold">{row.eventCount}</td>
                              <td className="px-3 py-2 text-slate-500">{row.lastSeen ? row.lastSeen.slice(0, 19) : "—"}</td>
                              <td className="px-3 py-2 text-[10px] text-slate-500">
                                {Object.entries(row.byKind)
                                  .slice(0, 4)
                                  .map(([k, v]) => `${k}:${v}`)
                                  .join(", ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <h3 className="text-sm font-semibold text-slate-900">Recent events</h3>
                    </div>
                    <div className="max-h-[420px] overflow-auto">
                      <table className="w-full min-w-[720px] text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] font-semibold uppercase text-slate-600">
                          <tr>
                            <th className="px-3 py-2">Time</th>
                            <th className="px-3 py-2">Kind</th>
                            <th className="px-3 py-2">Path</th>
                            <th className="px-3 py-2">Label</th>
                            <th className="px-3 py-2">UID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.recent.map((ev) => (
                            <tr key={ev.id} className="border-t border-slate-100 hover:bg-slate-50">
                              <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                                {ev.createdAt ? ev.createdAt.slice(0, 19) : "—"}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-900">{ev.kind}</td>
                              <td className="max-w-[200px] truncate px-3 py-2 font-mono text-[10px] text-slate-600">{ev.path}</td>
                              <td className="max-w-[140px] truncate px-3 py-2 text-slate-600">{ev.label ?? "—"}</td>
                              <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{ev.uid.slice(0, 10)}…</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold">Assessment price</h2>
                <p className="mt-2 text-xs text-slate-600">
                  INR charged before referral discounts ({`Stripe / Razorpay / PayPal`} receive this list price). Resolved
                  value is synced to checkout servers and the checkout page (~1 min cache lag for SSR bootstrap).
                  Firestore overrides <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_ASSESSMENT_PRICE_INR</code>{" "}
                  (env default shown as {envDefaultPriceInr} INR).
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="flex flex-col text-xs font-semibold text-slate-700">
                    List price (INR)
                    <input
                      type="number"
                      min={1}
                      max={500_000}
                      step={1}
                      value={priceInrDraft}
                      onChange={(e) => setPriceInrDraft(e.target.value)}
                      className="mt-1 w-full min-w-[10rem] rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium sm:w-40"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void saveAssessmentPriceInr()}
                    className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white"
                  >
                    Save price
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetPriceToEnvDefault()}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-800"
                  >
                    Clear override (use .env)
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold">Monetization</h2>
                <p className="mt-2 text-xs text-slate-600">
                  When off, new completions skip checkout. Server checks your Firestore admin role.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void patchSettings(!requirePayment)}
                    className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white"
                  >
                    {requirePayment ? "Disable payments (free results)" : "Enable payments"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold">Export hub</h2>
                <p className="mt-1 text-xs text-slate-500">Download snapshots for spreadsheets or audits.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => void downloadExport()}
                    className="rounded-xl bg-linear-to-r from-violet-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Full workbook (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadAttemptsCsv()}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
                  >
                    Attempts CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadUsersCsv()}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
                  >
                    Users CSV
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {attemptDrawerId && attemptDrawer ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40"
            aria-label="Close panel"
            onClick={() => setAttemptDrawerId(null)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Attempt detail</h3>
              <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setAttemptDrawerId(null)}>
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs">
              <dl className="space-y-2">
                {Object.entries(attemptDrawer).map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-semibold capitalize text-slate-500">{k}</dt>
                    <dd className="mt-0.5 overflow-x-auto font-mono text-[11px] text-slate-800">
                      {typeof v === "object" ? JSON.stringify(v).slice(0, 1800) : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 flex gap-2">
                <Link
                  href={(attemptDrawer.resultsUrl as string) ?? `#`}
                  target="_blank"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                >
                  Open results route
                </Link>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
