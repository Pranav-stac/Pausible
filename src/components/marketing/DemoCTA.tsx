import Link from "next/link";

export function DemoCTA({ href }: { href: string }) {
  return (
    <section className="px-1.5 pb-16 sm:px-2">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Product demo</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          See your narrative in{" "}
          <span className="bg-linear-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent">seven minutes</span>
          .
        </h2>
        <Link
          href={href}
          className="mt-8 flex items-center gap-5 rounded-3xl bg-linear-to-r from-[#0b47ff] via-[#4a7dff] to-[#20b7ff] px-6 py-5 text-white shadow-[0_28px_70px_-24px_rgba(11,71,255,.6)] transition hover:-translate-y-[2px] sm:px-9"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full bg-white/20 ring ring-white/40">
            <span className="ml-1 text-3xl">▶</span>
          </span>
          <div>
            <div className="text-lg font-semibold">Start the guided assessment</div>
            <div className="text-sm text-white/80">Structured checkpoints • Instant scoring draft • Pay to unlock full deck</div>
          </div>
        </Link>
      </div>
    </section>
  );
}
