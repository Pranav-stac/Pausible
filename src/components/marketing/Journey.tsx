import { CheckCircle } from "@/components/marketing/icons";
import {
  LABEL_CLASS,
  MARKETING_BODY,
  MARKETING_CONTAINER,
  MARKETING_HEADING,
  MARKETING_SECTION,
} from "@/components/marketing/marketing-brand";

const steps = [
  {
    title: "Answer structured prompts",
    body: "Focused questions map motivation, routines, recovery cues, and how you respond to stress.",
  },
  {
    title: "Get your wellness persona",
    body: "Dimensional scoring surfaces your primary archetype, trait profile, and behavioral patterns.",
  },
  {
    title: "Unlock your action plan",
    body: "A phased coach guide and wellness report tailored to how you actually operate.",
  },
] as const;

const pills = ["Evidence-backed structure", "Dimensional scoring", "Own your data", "Retake anytime"];

export function Journey() {
  return (
    <section className={`marketing-section-muted ${MARKETING_SECTION}`} id="journey" aria-labelledby="journey-heading">
      <div className={MARKETING_CONTAINER}>
        <header className="max-w-2xl">
          <p className={LABEL_CLASS}>How it works</p>
          <h2 id="journey-heading" className={`mt-3 text-balance text-3xl sm:text-4xl ${MARKETING_HEADING}`}>
            Three steps from assessment to action plan
          </h2>
          <p className={`mt-4 max-w-[48ch] ${MARKETING_BODY}`}>
            Transparent scoring, repeatable retakes, and a report you can share only when you choose.
          </p>
        </header>

        <ol className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-3">
          {steps.map((s, idx) => (
            <li key={s.title} className="pausable-surface rounded-2xl p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#2D82FF]/10 text-sm font-bold tabular-nums text-[#2D82FF]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-[#0D1B2A]">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4D4D4D]">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap gap-2 sm:mt-10">
          {pills.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600"
            >
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#00A8A7]" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
