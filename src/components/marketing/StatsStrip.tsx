const stats = [
  { label: "Profiles scored", value: "12k+" },
  { label: "Avg. completion time", value: "~7 min" },
  { label: "Coaches referencing Pausible", value: "400+" },
  { label: "Share moments captured", value: "8k+" },
];

export function StatsStrip() {
  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 sm:text-xs">By the numbers</p>
        <div className="mt-4 grid rounded-3xl border border-slate-200/90 bg-linear-to-br from-white via-slate-50 to-sky-50/40 px-4 py-10 shadow-[0_24px_64px_-40px_rgba(15,23,42,.15)] sm:mt-5 sm:px-6 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="border-b border-slate-200 px-4 py-4 text-center md:border-b-0 md:border-r md:border-slate-200 md:last:border-r-0"
          >
            <div className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2.125rem]">{s.value}</div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">{s.label}</div>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
