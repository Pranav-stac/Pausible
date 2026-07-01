import Image from "next/image";

import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import {
  CTA_PRIMARY_CLASS,
  CTA_SECONDARY_CLASS,
  LABEL_CLASS,
  MARKETING_BODY,
  MARKETING_CONTAINER,
} from "@/components/marketing/marketing-brand";

function HeroReportPreview() {
  const traits = [
    { label: "Discipline", value: 88 },
    { label: "Openness", value: 62 },
    { label: "Social Energy", value: 45 },
  ];

  return (
    <div className="pausable-surface relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#00A8A7]">Sample report</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-[#0D1B2A]">Steady Elephant</p>
        </div>
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7F9FB]">
          <Image
            src="/Personas/self_regulated_planner.jpeg"
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {traits.map((t) => (
          <div key={t.label}>
            <div className="mb-1 flex justify-between text-[11px] font-medium text-[#4D4D4D]">
              <span>{t.label}</span>
              <span className="tabular-nums">{t.value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#2D82FF]"
                style={{ width: `${t.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-100 bg-[#F7F9FB] px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Week 1 anchor</p>
        <p className="mt-1 text-sm leading-relaxed text-[#4D4D4D]">
          Move your bedtime 15 minutes earlier for one week and notice how recovery shifts.
        </p>
      </div>
    </div>
  );
}

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      className="marketing-hero-wash relative overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-16"
      id="top"
      aria-labelledby="hero-heading"
    >
      <div className={`${MARKETING_CONTAINER} grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14`}>
        <div className="min-w-0">
          <p className={LABEL_CLASS}>Wellness intelligence</p>

          <h1
            id="hero-heading"
            className="mt-4 max-w-[14ch] text-balance text-[2rem] font-bold leading-[1.08] tracking-tight text-[#0D1B2A] sm:text-5xl lg:text-[3.25rem]"
          >
            Wellness that fits how you&apos;re{" "}
            <span className="text-[#2D82FF]">wired</span>.
          </h1>

          <p className={`mt-5 max-w-[42ch] sm:mt-6 ${MARKETING_BODY}`}>
            A science-backed wellness persona built on your personality, not generic advice. See how you move,
            recover, and stay consistent in a way that actually fits you.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center">
            <TrackedAssessmentLink href={ctaHref} placement="hero_primary_cta" className={CTA_PRIMARY_CLASS}>
              Get started
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </TrackedAssessmentLink>
            <a href="#journey" className={CTA_SECONDARY_CLASS}>
              How it works
            </a>
          </div>

          <p className="mt-5 text-sm text-[#6E7191]">15–20 minutes · No credit card to begin</p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#00C9C8]/10 blur-2xl"
            aria-hidden
          />
          <HeroReportPreview />
        </div>
      </div>
    </section>
  );
}
