import { ArrowRight, CheckCircle } from "@/components/marketing/icons";
import { BrandLogo } from "@/components/BrandLogo";

const steps = [
  {
    title: "Structured profile",
    body: "Answer focused prompts—we map motivation, routines, recovery, and self-talk cues.",
  },
  {
    title: "Adaptive scoring",
    body: "Our engine derives dimensions and assigns a readiness archetype for clear next steps.",
  },
  {
    title: "Unlock results",
    body: "Finish the full flow to see your dimensional breakdown and playbook. You control what you share.",
  },
] as const;

const pills = ["Evidence-backed structure", "Dimensional scoring", "Own your data", "Retake anytime"];

export function Journey() {
  return (
    <section
      className="bg-white px-4 pb-28 pt-14 sm:px-6 sm:pb-16 sm:pt-16 lg:py-24"
      id="journey"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Assessment journey</p>
            <div className="inline-flex items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
              <BrandLogo heightClass="h-8 sm:h-9" className="opacity-95" withWordmark wordmarkClassName="text-base sm:text-lg" />
            </div>
          </div>
        </div>

        <h2 className="mt-8 max-w-[calc(100%-2.75rem)] text-pretty text-[1.6rem] font-semibold leading-snug tracking-tight text-slate-950 sm:mt-10 sm:max-w-3xl sm:text-4xl sm:leading-tight lg:mt-12 lg:text-[2.5rem] lg:leading-[1.15]">
          How <span className="font-semibold text-sky-500">Pausible</span>{" "}
          <span className="inline bg-linear-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text font-semibold text-transparent [background-size:120%_100%] pb-px">
            verifies your profile
          </span>
          .
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Transparent steps, repeatable scoring, and a premium report you&apos;ll actually want to share—with guardrails
          for privacy.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-5">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="group relative flex flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_22px_64px_-36px_rgba(15,23,42,.45)] ring-1 ring-slate-900/[0.03] transition hover:-translate-y-0.5 hover:border-sky-300/60 hover:shadow-[0_28px_70px_-32px_rgba(14,116,200,.35)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 min-w-12 place-items-center rounded-2xl border border-dashed border-sky-500/50 bg-linear-to-br from-sky-50/90 to-white text-base font-semibold tabular-nums text-sky-600">
                  {i + 1}
                </div>
                {i < steps.length - 1 ? (
                  <ArrowRight
                    className="hidden h-5 w-5 text-slate-300 md:block md:translate-x-1"
                    aria-hidden
                  />
                ) : null}
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-2 sm:gap-2.5">
          {pills.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm shadow-emerald-600/10"
            >
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
