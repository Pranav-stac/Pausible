"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchAttempt } from "@/lib/data/attempt-service";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { localResolveShareToken } from "@/lib/local/attempts";
import type { ShareSnapshot } from "@/lib/data/share-service";
import { personaAnimal, personaLabel } from "@/lib/results/persona-display";
import { dimensionRowsForAttempt } from "@/lib/results/dimension-rows";
import { PERSONA_REPORT_THEME } from "@/lib/results/persona-report-theme";
import type { PersonaKey } from "@/lib/scoring/persona-types";

function TraitBar({ label, pct, accent, idx }: { label: string; pct: number; accent: string; idx: number }) {
  const hues = ["#0ea5e9", "#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b"];
  const c = hues[idx % hues.length];
  return (
    <div className="rounded-xl bg-white/90 px-3 py-2.5 ring-1 ring-slate-200/80">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-600">{label.split(" ")[0]}</span>
        <span className="font-black tabular-nums text-slate-900">{pct}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}, ${accent})` }}
        />
      </div>
    </div>
  );
}

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
        const primaryLabel = personaLabel(attempt.scores?.archetypeKey);
        const secondaryLabel = personaLabel(attempt.scores?.secondaryArchetypeKey);
        const persona = attempt.scores?.persona;
        const animal = personaAnimal(attempt.scores?.archetypeKey);
        const fitScore = persona?.fitScore;
        const dimensionBars = dimensionRowsForAttempt(assessment, attempt).slice(0, 5);

        if (!cancelled) {
          setData({
            token,
            attemptId: attempt.id,
            uid: attempt.uid,
            assessmentId: attempt.assessmentId,
            assessmentTitle: assessment.title,
            archetypeKey: attempt.scores?.archetypeKey,
            archetypeLabel: primaryLabel,
            personaTitle: persona?.personaTitle ?? undefined,
            fitScore: fitScore != null ? Math.round(fitScore) : undefined,
            animalEmoji: animal?.emoji ?? undefined,
            secondaryArchetypeKey: attempt.scores?.secondaryArchetypeKey,
            secondaryArchetypeLabel: secondaryLabel,
            summary:
              fitScore != null
                ? `${Math.round(fitScore)}% persona fit · wellness intelligence`
                : persona?.personaTitle ?? primaryLabel,
            bullets: [],
            dimensionBars,
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
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-50 to-white px-4">
        <div className="max-w-md text-center">
          <p className="text-sm text-slate-600">{error}</p>
          <Link href="/" className="mt-6 inline-block text-sm font-bold text-sky-700">
            Back to Pausible
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-50 to-white text-sm text-slate-500">
        Loading snapshot…
      </div>
    );
  }

  const headline = data.personaTitle ?? data.archetypeLabel;
  const accent =
    data.archetypeKey && data.archetypeKey in PERSONA_REPORT_THEME
      ? PERSONA_REPORT_THEME[data.archetypeKey as PersonaKey].hex
      : "#0284c7";
  const animal = data.archetypeKey ? personaAnimal(data.archetypeKey) : null;
  const emoji = data.animalEmoji ?? animal?.emoji;

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50/80 via-white to-indigo-50/40 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-lg">
        {/* Card — mirrors story poster */}
        <div
          className="overflow-hidden rounded-[2rem] shadow-[0_32px_80px_-24px_rgba(14,165,233,0.35)] ring-1 ring-slate-200/80"
          style={{ background: "linear-gradient(165deg, #f0f9ff 0%, #ffffff 45%, #f8fafc 100%)" }}
        >
          <div className="px-6 pt-8 pb-6 text-center sm:px-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">Pausible</span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-sky-800">
                Shared snapshot
              </span>
            </div>

            <div
              className="relative mx-auto mt-8 flex size-32 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(from 200deg, ${accent}, #e2e8f0 40%, ${accent}66)`,
                boxShadow: `0 16px 40px -12px ${accent}55`,
              }}
            >
              <div className="absolute inset-2 rounded-full bg-white" />
              {animal?.imagePath ? (
                <div className="relative z-10 size-16 overflow-hidden rounded-2xl">
                  <Image src={animal.imagePath} alt="" width={64} height={64} className="h-full w-full object-cover" />
                </div>
              ) : (
                <span className="relative z-10 text-4xl">{emoji ?? "✦"}</span>
              )}
            </div>

            <h1 className="mt-6 text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-[1.65rem]">
              {headline}
            </h1>

            {data.fitScore != null ? (
              <div
                className="mt-4 inline-flex items-baseline gap-1.5 rounded-full px-4 py-2 ring-1"
                style={{ backgroundColor: `${accent}0d`, borderColor: `${accent}33` }}
              >
                <span className="text-2xl font-black tabular-nums" style={{ color: accent }}>
                  {data.fitScore}%
                </span>
                <span className="text-xs font-semibold text-slate-600">persona fit</span>
              </div>
            ) : null}

            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-slate-600">{data.summary}</p>

            {data.secondaryArchetypeLabel ? (
              <p className="mt-3 text-xs font-semibold text-slate-500">
                Secondary influence · {data.secondaryArchetypeLabel}
              </p>
            ) : null}
          </div>

          {data.dimensionBars && data.dimensionBars.length > 0 ? (
            <div className="border-t border-slate-100 bg-white/60 px-6 py-6 sm:px-8">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Behavioral footprint</p>
              <div className="grid grid-cols-2 gap-2">
                {data.dimensionBars.map((d, i) => (
                  <TraitBar key={d.key} label={d.label} pct={d.pct} accent={accent} idx={i} />
                ))}
              </div>
            </div>
          ) : null}

          {data.bullets.length > 0 ? (
            <div className="border-t border-slate-100 px-6 py-5 sm:px-8">
              <ul className="space-y-2 text-sm text-slate-700">
                {data.bullets.slice(0, 3).map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/assessment/default"
            className="inline-flex rounded-full px-8 py-3.5 text-sm font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accent}, #6366f1)` }}
          >
            Discover your wellness profile
          </Link>
          <p className="mt-4 text-xs text-slate-500">Take the assessment on Pausible</p>
        </div>
      </div>
    </div>
  );
}
