const cards = [
  {
    kicker: "READINESS GRAPH",
    title: "See how your habits stack—not just totals.",
    body: "Radar-friendly dimensions distilled into human language: drive, architecture, recovery balance.",
    tags: ["High signal", "Actionable cues", "Coaching-ready"],
    rows: ["Movement motivation index", "Structure adherence", "Stress adaptation"],
    accentClass: "from-sky-50 to-indigo-50/70",
    borderClass: "border-sky-200/80",
  },
  {
    kicker: "RESULTS CRAFTED",
    title: "A report you'll screenshot on purpose.",
    body: "Clear typography, disciplined layout, archetype cards—with export-ready visuals.",
    tags: ["OG-ready previews", "Share latest only"],
    rows: ["Polished summaries", "Checklist rituals", "Next 7-day playbook"],
    accentClass: "from-violet-50 to-sky-50/60",
    borderClass: "border-violet-200/70",
  },
] as const;

export function FeatureBand() {
  return (
    <section className="border-y border-slate-100 bg-white px-4 py-16 sm:px-6 lg:py-20">
      <header className="mx-auto mb-10 max-w-7xl lg:mb-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 sm:text-xs">
          Depth & differentiation
        </p>
        <h2 className="mt-3 max-w-2xl text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Signal you can coach with—not{" "}
          <span className="bg-linear-to-r from-sky-600 via-sky-500 to-indigo-500 bg-clip-text text-transparent">noise masquerading as insight.</span>
        </h2>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.kicker}
            className={`rounded-3xl border ${c.borderClass} bg-linear-to-br ${c.accentClass} p-[1px] shadow-[0_20px_64px_-40px_rgba(15,23,42,.2)]`}
          >
            <div className="rounded-3xl border border-white/70 bg-white/90 p-7 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500">{c.kicker}</p>
              <h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.875rem]">{c.title}</h3>
              <p className="mt-3 max-w-xl text-sm text-slate-600">{c.body}</p>

              <div className="mt-6 rounded-3xl border border-slate-200/90 bg-slate-50/80 p-5">
                {c.rows.map((r) => (
                  <div
                    key={r}
                    className="mb-4 flex items-center justify-between rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm last:mb-0"
                  >
                    <span>{r}</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                      Mapped
                    </span>
                  </div>
                ))}
              </div>

              <ul className="mt-8 space-y-3 text-xs font-medium text-slate-700 sm:text-sm">
                {c.tags.map((tag) => (
                  <li key={tag} className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full border border-sky-200 bg-sky-100" />
                    <span>{tag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-7xl rounded-3xl border border-emerald-200/70 bg-linear-to-br from-emerald-50 via-white to-teal-50 p-[1px] shadow-[0_20px_64px_-40px_rgba(6,95,70,.2)]">
        <div className="grid gap-8 rounded-3xl border border-white/80 bg-white/95 p-8 text-slate-900 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-700/90">History & precision</p>
            <h4 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Every retake is a paid, fresh runway.</h4>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              We keep your previous attempts privately—never shareable—but always readable for longitudinal insight.
              Your outward-facing card reflects only the newest paid spotlight.
            </p>
          </div>
          <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/50 p-6">
            {["Snapshots stored per attempt", "Non-shareable history rail", "Optional Google linking"].map((t) => (
              <div key={t} className="mb-4 flex justify-between rounded-2xl border border-white bg-white px-4 py-4 text-sm text-slate-800 shadow-sm last:mb-0">
                <span>{t}</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                  Locked in
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
