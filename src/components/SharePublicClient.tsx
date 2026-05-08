"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchAttempt } from "@/lib/data/attempt-service";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { localResolveShareToken } from "@/lib/local/attempts";
import type { ShareSnapshot } from "@/lib/data/share-service";
import { getArchetypeCopy } from "@/lib/results/archetype";

export function SharePublicClient() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<ShareSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) return;
      try {
        if (isFirebaseConfigured()) {
          const db = getFirebaseDb();
          if (db) {
            const snap = await getDoc(doc(db, "share_snapshots", token));
            if (snap.exists()) {
              const d = snap.data() as ShareSnapshot & { createdAt?: unknown };
              if (!cancelled) setData(d);
              return;
            }
          }
        }

        const attemptId = localResolveShareToken(token);
        if (!attemptId) {
          if (!cancelled) setError("This share link is unavailable in this browser session.");
          return;
        }
        const attempt = await fetchAttempt(attemptId);
        if (!attempt || attempt.paymentStatus !== "paid" || !attempt.isLatestShareEligible) {
          if (!cancelled) setError("This share link is outdated or private.");
          return;
        }
        const assessment = await fetchAssessment(attempt.assessmentId);
        if (!assessment) {
          if (!cancelled) setError("This assessment is unavailable.");
          return;
        }
        const arch = getArchetypeCopy(assessment, attempt.scores?.archetypeKey);
        if (!cancelled) {
          setData({
            token,
            attemptId: attempt.id,
            uid: attempt.uid,
            assessmentId: attempt.assessmentId,
            assessmentTitle: assessment.title,
            archetypeKey: attempt.scores?.archetypeKey,
            archetypeLabel: arch?.label ?? "Your profile",
            summary: arch?.summary ?? "",
            bullets: arch?.bullets ?? [],
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load share card");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return null;

  if (error) {
    return (
      <div className="min-h-screen bg-white px-3 py-20 text-center">
        <p className="text-sm text-slate-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-sky-600">
          Back to Pausible
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        Loading spotlight…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white px-3 py-12 sm:px-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-linear-to-br from-[#050816] via-[#08112d] to-[#050816] p-[1px] shadow-[0_34px_100px_-32px_rgba(12,25,78,.6)]">
          <div className="rounded-3xl bg-linear-to-b from-[#040b1c] to-[#050816] px-8 py-10 text-center text-white">
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/55">Pausible spotlight</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{data.archetypeLabel}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75">{data.summary}</p>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">What stands out</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {data.bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/assessment/default"
            className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
          >
            Take the assessment on Pausible
          </Link>
        </div>
      </div>
    </div>
  );
}
