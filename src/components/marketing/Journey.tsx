import { CheckCircle } from "@/components/marketing/icons";

const steps = [
  {
    title: "Structured profile",
    body: "Focused prompts map motivation, routines, recovery cues, and self-talk—fast, no fluff.",
  },
  {
    title: "Adaptive scoring",
    body: "Dimensions + a readiness archetype so next steps stay concrete, not mystical.",
  },
  {
    title: "Unlock results",
    body: "Full breakdown when you finish; spotlight sharing only when you decide.",
  },
] as const;

const pills = ["Evidence-backed structure", "Dimensional scoring", "Own your data", "Retake anytime"];

export function Journey() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-11" id="journey">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(226 232 240 / 0.55) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.55) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-8 text-center sm:mb-9 sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-500">Assessment journey</p>
          <h2 className="mx-auto mt-3 max-w-xl text-balance text-[1.45rem] font-semibold leading-tight tracking-tight text-slate-950 sm:mx-0 sm:max-w-2xl sm:text-[1.72rem] sm:leading-[1.2] lg:text-[1.92rem]">
            How{" "}
            <span className="font-semibold tabular-nums text-[#2b6cbf]">Pausible</span>{" "}
            <span className="bg-linear-to-r from-[#3d9fff] via-[#61aaff] to-[#7dd8ff] bg-clip-text font-semibold text-transparent">
              verifies your profile
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-slate-600 sm:mx-0 sm:text-sm">
            Three compact beats—transparent scoring, repeatable retakes, and privacy you hold.
          </p>
        </header>

        <div className="relative overflow-hidden rounded-[1.35rem] border border-[#1e3965]/85 bg-linear-to-br from-[#050816] via-[#07122a] to-[#050918] shadow-[0_42px_100px_-48px_rgba(125,216,255,0.28)] ring-2 ring-black/55">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              background:
                "radial-gradient(circle at 105% -10%, rgb(125 216 255 / 0.18), transparent 46%), radial-gradient(circle at -8% 108%, rgb(61 159 255 / 0.12), transparent 42%)",
            }}
            aria-hidden
          />

          <ol className="relative grid divide-y divide-white/[0.09] sm:grid-cols-3 sm:divide-x sm:divide-white/[0.09] sm:divide-y-0">
            {steps.map((s, idx) => (
              <li key={s.title} className="relative px-5 py-[1.125rem] sm:px-[1.15rem] sm:py-[1.35rem] lg:px-6 lg:py-7">
                <div className="flex items-start gap-3.5">
                  <span className="mt-0.5 grid h-[2.25rem] min-w-[2.25rem] place-items-center rounded-xl bg-black/38 text-[12px] font-bold tabular-nums text-[#9fe9ff] ring-2 ring-[#61aaff]/35 shadow-[inset_0_1px_0_rgb(125_216_255_/_22%)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-[0.9rem] font-semibold leading-snug tracking-tight text-white">{s.title}</h3>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/[0.58] sm:text-[12px]">{s.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-9 sm:justify-start">
          {pills.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-[0.3125rem] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600 shadow-[0_8px_24px_-14px_rgba(15,23,42,0.18)] ring-2 ring-transparent transition hover:border-[#61aaff]/55 hover:text-slate-800 hover:shadow-[0_12px_32px_-16px_rgba(125,216,255,0.35)] hover:ring-[#61aaff]/15"
            >
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[#3d9fff]" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
