"use client";

import Image from "next/image";

import {
  MarketingReveal,
  MarketingStagger,
  MarketingStaggerItem,
} from "@/components/marketing/MarketingReveal";

const FEATURES = [
  {
    title: "Personality Insights",
    body: "How your traits shape your real relationship with wellness.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Blind spots",
    body: "The patterns that quietly derail you — named, without judgment.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Tailored recommendations",
    body: "Habits matched to your rhythm, not someone else's ideal.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    title: "Action priorities",
    body: "Where to start, so the first step feels obvious.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Your Coach Guide",
    body: "A companion framework for turning your report insights into daily practice — structured, personal, and built around how you operate.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
] as const;

const PILLARS = [
  {
    title: "Psychologically personalized",
    body: "Matched to your actual personality — not your age, weight, or goals on paper.",
  },
  {
    title: "Emotionally intelligent",
    body: "No shame, no 'just stay disciplined.' Restarts are normal — we plan for them.",
  },
  {
    title: "Made for real people",
    body: "For busy lives, not ideal ones. Sustainable beats impressive, every time.",
  },
] as const;

function TraitBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-medium text-[#4D4D4D]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="pausibl-gradient-bg h-full rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ReportSection() {
  return (
    <section className="scroll-mt-20 bg-white" id="report" aria-labelledby="report-heading">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-start gap-[60px] px-6 py-[104px]">
          <div className="min-w-[300px] flex-1 basis-[380px]">
            <MarketingReveal>
              <p className="mb-4 text-[13px] font-bold tracking-[1.5px] text-[var(--marketing-accent)] uppercase">
                Your report
              </p>
              <h2
                id="report-heading"
                className="mb-[30px] text-balance text-[clamp(1.75rem,3.4vw,2.625rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#111827]"
              >
                A wellness report that reads like it knows you.
              </h2>
            </MarketingReveal>

            <MarketingStagger className="flex flex-col gap-6">
              {FEATURES.map((f) => (
                <MarketingStaggerItem key={f.title}>
                  <div className="flex items-start gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[image:var(--marketing-grad-soft)] text-[var(--marketing-accent)]">
                      {f.icon}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-[#111827]">{f.title}</h3>
                      <p className="mt-1 text-[15px] leading-[1.55] text-[#4B5563]">{f.body}</p>
                    </div>
                  </div>
                </MarketingStaggerItem>
              ))}
            </MarketingStagger>
          </div>

          <MarketingReveal className="flex min-w-[300px] flex-1 basis-[380px] flex-col gap-3.5 lg:sticky lg:top-24" delay={0.1}>
            <article className="overflow-hidden rounded-[20px] border border-[#EAEBEE] bg-white shadow-[0_12px_36px_-18px_rgba(17,24,39,0.18)]">
              <div className="flex items-center justify-between bg-[image:var(--marketing-grad)] px-5 py-3.5 text-[11px] font-semibold tracking-[0.5px] text-white/85 uppercase">
                <span className="text-sm font-bold tracking-[0.08em] text-white/90">PAUSIBL</span>
                <span>Wellness Intelligence Report</span>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00C9C8]">Primary Persona</p>
                <h3 className="mt-1 text-xl font-bold text-[#0D1B2A]">Steady Elephant</h3>
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F7F9FB]">
                    <Image
                      src="/Personas/self_regulated_planner.jpeg"
                      alt=""
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <TraitBar label="Discipline" value={91} />
                    <TraitBar label="Curiosity" value={46} />
                    <TraitBar label="Social Energy" value={68} />
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(13,27,42,0.1)] sm:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00C9C8]">Your blind spots</p>
              <ul className="mt-3 space-y-2">
                {[
                  "You may over-plan and resist spontaneity when routines break.",
                  "Recovery can slip when structure feels threatened.",
                ].map((item) => (
                  <li key={item} className="rounded-xl bg-[#F7F9FB] px-4 py-3 text-sm leading-relaxed text-[#4D4D4D]">
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl bg-[#0D1B2A] p-5 text-white shadow-[0_12px_40px_-16px_rgba(13,27,42,0.35)] sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg pausibl-gradient-bg text-xs">✓</span>
                <h3 className="font-semibold">Coach Guide — Week 1 Focus</h3>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-white/85">
                {[
                  { text: "Anchor training to calendar blocks", done: true },
                  { text: "Use a checklist for high-stress weeks", done: true },
                  { text: "Build in one flexible recovery day", done: false },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2.5">
                    <span
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        item.done ? "border-[#00C9C8] bg-[#00C9C8] text-[10px] text-white" : "border-white/40"
                      }`}
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </article>
          </MarketingReveal>
      </div>

      <div className="border-y border-[#F3F4F6] bg-[#F9FAFB] px-6 py-[104px]">
        <div className="mx-auto max-w-[1160px] text-center">
          <MarketingReveal>
            <p className="mb-4 text-[13px] font-bold tracking-[1.5px] text-[var(--marketing-accent)] uppercase">
              Why it works
            </p>
            <h2 className="mx-auto mb-[18px] max-w-[640px] text-balance text-[clamp(1.75rem,3.6vw,2.625rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#111827]">
              Built on behavioral science, not trends.
            </h2>
            <p className="mx-auto max-w-[640px] text-pretty text-lg leading-[1.6] text-[#4B5563]">
              Pausibl is grounded in the OCEAN personality framework — the most validated model in modern psychology —
              translated into guidance that feels human.
            </p>
          </MarketingReveal>

          <MarketingStagger className="mt-[60px] grid gap-[22px] [grid-template-columns:repeat(auto-fit,minmax(248px,1fr))]">
            {PILLARS.map((p) => (
              <MarketingStaggerItem key={p.title}>
                <article className="h-full rounded-[22px] border border-[#F1F2F4] bg-white px-7 py-8 text-left">
                  <span className="mb-5 inline-block h-[46px] w-[46px] rounded-[13px] bg-[image:var(--marketing-grad)] shadow-[0_10px_22px_-12px_rgba(2,132,199,0.6)]" />
                  <h3 className="text-[19px] font-bold text-[#111827]">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.6] text-[#4B5563]">{p.body}</p>
                </article>
              </MarketingStaggerItem>
            ))}
          </MarketingStagger>
        </div>
      </div>
    </section>
  );
}
