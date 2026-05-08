const stats = [
  { label: "Profiles scored", value: "12k+" },
  { label: "Avg. completion time", value: "~7 min" },
  { label: "Coaches referencing Pausible", value: "400+" },
  { label: "Share moments captured", value: "8k+" },
];

export function StatsStrip() {
  return (
    <section className="px-1.5 pb-14 sm:px-2 lg:pb-18">
      <div className="mx-auto grid max-w-7xl rounded-3xl bg-linear-to-br from-[#030616] via-[#050b1f] to-[#020312] px-4 py-10 text-white shadow-[0_38px_100px_-32px_rgba(15,23,42,.7)] sm:px-6 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-b border-white/10 px-4 py-4 text-center md:border-b-0 md:border-r md:border-white/10 md:last:border-r-0">
            <div className="text-3xl font-semibold tracking-tight sm:text-[2.125rem]">{s.value}</div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/52">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
