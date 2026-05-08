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
    <div className="mx-auto mt-10 w-full max-w-2xl text-left">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Choose a profile</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((a) => (
          <TrackedAssessmentLink
            key={a.id}
            href={`/assessment/${encodeURIComponent(a.id)}`}
            placement={`hero_assessment_card_${a.id}`}
            className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-left text-sm text-white shadow-sm ring ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/14"
          >
            <div className="font-semibold text-white">{a.title}</div>
            {a.description ? <p className="mt-1 text-xs leading-relaxed text-white/65">{a.description}</p> : null}
          </TrackedAssessmentLink>
        ))}
      </div>
    </div>
  );
}
