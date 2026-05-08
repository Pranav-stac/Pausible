import { Stars } from "@/components/marketing/icons";

const stories = [
  {
    quote:
      "Finally an assessment that explains *why* I stall after week three. The archetype breakdown made coaching sessions sharper.",
    name: "Aditi S.",
    role: "Hybrid athlete",
  },
  {
    quote: "We send athletes through Pausible before programming—saves hours of guesswork and sets the tone.",
    name: "Rahul V.",
    role: "Strength coach, Pune",
  },
  {
    quote: "Share card was stunning. Clients ask if we hired a design studio—nope, that's the default Pausible report.",
    name: "Meera K.",
    role: "Studio owner, Bengaluru",
  },
];

export function Testimonials() {
  return (
    <section className="bg-white px-1.5 py-16 sm:px-2 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Social proof</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Builders, coaches, and athletes trust the{" "}
          <span className="bg-linear-to-r from-sky-500 to-indigo-500 bg-clip-text text-transparent">Pausible</span>{" "}
          report.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {stories.map((s) => (
            <figure
              key={s.name}
              className="flex h-full flex-col justify-between rounded-3xl border border-slate-200/80 bg-slate-50/80 p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,.45)]"
            >
              <div>
                <Stars />
                <blockquote className="mt-4 text-sm leading-relaxed text-slate-700">{s.quote}</blockquote>
              </div>
              <figcaption className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{s.name}</span> — {s.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
