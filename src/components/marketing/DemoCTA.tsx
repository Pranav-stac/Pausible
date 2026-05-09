import { GradientAssessmentCta } from "@/components/marketing/GradientAssessmentCta";

export function DemoCTA({ href }: { href: string }) {
  return (
    <section className="border-t border-slate-100 bg-white px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 sm:text-xs">Product demo</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          See your narrative in{" "}
          <span className="bg-linear-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent">seven minutes</span>
          .
        </h2>

        <GradientAssessmentCta href={href} placement="demo_section_strip" className="mt-8" />
      </div>
    </section>
  );
}
