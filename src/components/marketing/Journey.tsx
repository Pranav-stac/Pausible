"use client";

import { CheckCircle } from "@/components/marketing/icons";
import {
  MarketingReveal,
  MarketingStagger,
  MarketingStaggerItem,
} from "@/components/marketing/MarketingReveal";
import {
  CARD_SURFACE_CLASS,
  MARKETING_BODY,
  MARKETING_CONTAINER,
  MARKETING_HEADING,
  MARKETING_SECTION,
} from "@/components/marketing/marketing-brand";

const steps = [
  {
    title: "Answer structured prompts",
    body: "Focused questions map motivation, routines, recovery cues, and how you respond to stress.",
    accent: "from-[#00C9C8]/12 to-[#2D82FF]/8",
    span: "lg:col-span-7 lg:row-span-2",
  },
  {
    title: "Get your wellness persona",
    body: "Dimensional scoring surfaces your primary archetype, trait profile, and behavioral patterns.",
    accent: "from-[#2D82FF]/10 to-transparent",
    span: "lg:col-span-5",
  },
  {
    title: "Unlock your action plan",
    body: "A phased coach guide and wellness report tailored to how you actually operate.",
    accent: "from-[#00C9C8]/10 to-transparent",
    span: "lg:col-span-5",
  },
] as const;

const pills = ["Evidence-backed structure", "Dimensional scoring", "Own your data", "Retake anytime"];

export function Journey() {
  return (
    <section className={`marketing-section-muted ${MARKETING_SECTION}`} id="journey" aria-labelledby="journey-heading">
      <div className={MARKETING_CONTAINER}>
        <MarketingReveal className="max-w-2xl">
          <h2 id="journey-heading" className={`text-balance text-3xl sm:text-4xl ${MARKETING_HEADING}`}>
            Three steps from assessment to action plan
          </h2>
          <p className={`mt-4 max-w-[48ch] ${MARKETING_BODY}`}>
            Transparent scoring, repeatable retakes, and a report you can share only when you choose.
          </p>
        </MarketingReveal>

        <MarketingStagger className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
          {steps.map((s, idx) => (
            <MarketingStaggerItem key={s.title} className={s.span}>
              <article
                className={`${CARD_SURFACE_CLASS} h-full bg-linear-to-br ${s.accent} ${
                  idx === 0 ? "lg:flex lg:flex-col lg:justify-between lg:p-8" : ""
                }`}
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-sm font-bold tabular-nums text-[#2D82FF] shadow-sm ring-1 ring-slate-200/80">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className={idx === 0 ? "mt-6 lg:mt-0" : "mt-4"}>
                  <h3 className="text-lg font-semibold tracking-tight text-[#0D1B2A] sm:text-xl">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4D4D4D] sm:text-[15px]">{s.body}</p>
                </div>
                {idx === 0 ? (
                  <div className="mt-6 hidden rounded-xl border border-white/60 bg-white/50 p-4 backdrop-blur-sm lg:block">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#00A8A7]">What you get</p>
                    <p className="mt-1 text-sm text-[#4D4D4D]">
                      Trait scores, persona match, blind spots, and a week-one coach guide.
                    </p>
                  </div>
                ) : null}
              </article>
            </MarketingStaggerItem>
          ))}
        </MarketingStagger>

        <MarketingReveal className="mt-8 flex flex-wrap gap-2 sm:mt-10" delay={0.1}>
          {pills.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600 backdrop-blur-sm"
            >
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#00A8A7]" />
              {p}
            </span>
          ))}
        </MarketingReveal>
      </div>
    </section>
  );
}
