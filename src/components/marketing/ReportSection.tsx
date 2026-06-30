import Image from "next/image";

import { LABEL_CLASS } from "@/components/marketing/marketing-brand";
import { USER_FACING_TRAIT_LIST } from "@/lib/results/trait-labels";

const FEATURES = [
  {
    title: "Personalized Persona Profile",
    body: "Your primary wellness archetype with a visual breakdown of your behavioral traits.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Behavioral Traits Breakdown",
    body: `See how ${USER_FACING_TRAIT_LIST} shape your habits.`,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 20V10M10 20V4M16 20v-8M22 20V14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Blind Spot Insights",
    body: "Honest, science-backed observations about patterns that may be holding you back.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    title: "Coach Guide & Action Plan",
    body: "A week-by-week coaching guide tailored to your persona — not generic wellness tips.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Shareable Report Cards",
    body: "Beautiful, exportable cards you can share with coaches, trainers, or your wellness circle.",
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
    body: "Every insight is mapped to your wellness personality profile — not a one-size-fits-all template.",
  },
  {
    title: "Behaviorally actionable",
    body: "Recommendations are designed around how you actually think, feel, and respond to challenge.",
  },
  {
    title: "Built for real life",
    body: "Your coach guide adapts to your persona's strengths and blind spots — so change sticks.",
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
    <section className="bg-white" id="report" aria-labelledby="report-heading">
      <div className="px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div>
            <p className={LABEL_CLASS}>Your report</p>
            <h2
              id="report-heading"
              className="mt-3 text-balance text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl"
            >
              A wellness report that reads like it knows you.
            </h2>

            <ul className="mt-8 space-y-5">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl pausibl-gradient-bg text-white shadow-sm">
                    {f.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#0D1B2A]">{f.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#4D4D4D]">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24">
            <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_12px_40px_-16px_rgba(13,27,42,0.15)]">
              <div className="flex items-center justify-between px-4 py-2.5 pausibl-gradient-bg text-[10px] font-semibold uppercase tracking-wider text-white sm:px-5">
                <span>PA · SSL</span>
                <span className="text-white/90">Wellness Intelligence Report</span>
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
                    <TraitBar label="Discipline" value={88} />
                    <TraitBar label="Openness" value={62} />
                    <TraitBar label="Social Energy" value={45} />
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
          </div>
        </div>
      </div>

      <div className="bg-[#F9F9F9] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl text-center">
          <p className={LABEL_CLASS}>Why it works</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl">
            Built on behavioral science, not trends.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-[#4D4D4D] sm:text-base">
            Pausibl uses a validated five-trait wellness model to map how you think, feel, and act. Your
            report isn&apos;t a horoscope. It&apos;s a behavioral profile you can use.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {PILLARS.map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-[0_8px_30px_-12px_rgba(13,27,42,0.1)]"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl pausibl-gradient-bg text-white shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </span>
                <h3 className="mt-4 font-bold text-[#0D1B2A]">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4D4D4D]">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
