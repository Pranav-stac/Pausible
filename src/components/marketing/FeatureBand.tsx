const cards = [
  {
    kicker: "READINESS GRAPH",
    title: "See how your habits stack—not just totals.",
    body: "Radar-friendly dimensions distilled into human language: drive, architecture, recovery balance.",
    tags: ["High signal", "Actionable cues", "Coaching-ready"],
    from: "#3b0f1d",
    to: "#1b0f1d",
    rows: ["Movement motivation index", "Structure adherence", "Stress adaptation"],
  },
  {
    kicker: "RESULTS CRAFTED",
    title: "A report you'll screenshot on purpose.",
    body: "Gradient glass surfaces, disciplined typography, spotlight cards for archetypes—with exportable vibes.",
    tags: ["OG-ready previews", "Share latest only"],
    from: "#0d1f5f",
    to: "#130b52",
    rows: ["Polished summaries", "Checklist rituals", "Next 7-day playbook"],
  },
] as const;

export function FeatureBand() {
  return (
    <section className="px-1.5 pb-16 sm:px-2 lg:pb-20">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
        {cards.map((c) => (
          <div key={c.kicker} className="rounded-3xl p-[1px] shadow-[0_24px_80px_-38px_rgba(15,23,42,.6)] ring-1 ring-white/50">
            <div
              className="rounded-3xl p-7 text-white"
              style={{
                background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">{c.kicker}</p>
              <h3 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-[1.875rem]">{c.title}</h3>
              <p className="mt-3 max-w-xl text-sm text-white/70">{c.body}</p>

              <div className="mt-6 rounded-3xl bg-white/5 p-5 ring-1 ring-white/20 backdrop-blur-md">
                {c.rows.map((r) => (
                  <div key={r} className="mb-4 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80 ring ring-white/10 last:mb-0">
                    <span>{r}</span>
                    <span className="rounded-full bg-white/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring ring-white/20">
                      Mapped
                    </span>
                  </div>
                ))}
              </div>

              <ul className="mt-8 space-y-3 text-xs font-medium text-white/80 sm:text-sm">
                {c.tags.map((tag) => (
                  <li key={tag} className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full border border-white/35 bg-linear-to-br from-emerald-100/50 to-transparent" />
                    <span>{tag}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-6 max-w-7xl rounded-3xl border border-emerald-200/55 bg-linear-to-br from-emerald-900 via-green-950 to-emerald-900 p-[1px] shadow-[0_24px_80px_-30px_rgba(8,107,72,.7)]">
        <div className="grid gap-8 rounded-3xl bg-linear-to-br from-emerald-900 via-emerald-950 to-emerald-900 p-8 text-white md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200/70">
              HISTORY & PRECISION
            </p>
            <h4 className="mt-4 text-3xl font-semibold tracking-tight">Every retake is a paid, fresh runway.</h4>
            <p className="mt-4 text-sm leading-relaxed text-emerald-100/70">
              We keep your previous attempts privately—never shareable—but always readable for longitudinal insight.
              Your outward-facing card always reflects only the newest paid spotlight.
            </p>
          </div>
          <div className="rounded-3xl bg-white/5 p-6 ring ring-white/20 backdrop-blur-md">
            {["Snapshots stored per attempt", "Non-shareable history rail", "Optional Google linking"].map((t) => (
              <div key={t} className="mb-4 flex justify-between rounded-2xl bg-white/10 px-4 py-4 text-sm last:mb-0">
                <span>{t}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200 ring ring-white/20">
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
