"use client";

import { useEffect, useState } from "react";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import { listActiveAssessmentSummaries } from "@/lib/data/assessment-service";

type Item = { id: string; title: string; description?: string };

export function ActiveAssessmentCards() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    void listActiveAssessmentSummaries().then(setItems);
  }, []);

  if (items.length <= 1) return null;

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl text-left sm:mt-10">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Choose a profile</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((a) => (
          <TrackedAssessmentLink
            key={a.id}
            href={`/assessment/${encodeURIComponent(a.id)}`}
            placement={`hero_assessment_card_${a.id}`}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left text-sm text-slate-900 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
          >
            <div className="font-semibold text-slate-900">{a.title}</div>
            {a.description ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.description}</p> : null}
          </TrackedAssessmentLink>
        ))}
      </div>
    </div>
  );
}
