import Image from "next/image";

const traits = [
  { label: "Discipline", value: 88 },
  { label: "Openness", value: 62 },
  { label: "Social Energy", value: 45 },
];

export function HeroPreview() {
  return (
    <div className="marketing-glass rounded-3xl p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-[#F1F2F4] pb-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[#0284C7] uppercase">Sample report</p>
          <p className="mt-1 text-xl font-bold tracking-[-0.01em] text-[#111827]">Steady Elephant</p>
        </div>
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F9FAFB]">
          <Image
            src="/Personas/self_regulated_planner.jpeg"
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {traits.map((t) => (
          <div key={t.label}>
            <div className="mb-1 flex justify-between text-[11px] font-medium text-[#4B5563]">
              <span>{t.label}</span>
              <span className="tabular-nums">{t.value}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
              <div className="h-full rounded-full bg-[image:var(--marketing-grad)]" style={{ width: `${t.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#F1F2F4] bg-[#F9FAFB] px-4 py-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-[#9CA3AF] uppercase">Week 1 anchor</p>
        <p className="mt-1 text-sm leading-relaxed text-[#4B5563]">
          Move your bedtime 15 minutes earlier for one week and notice how recovery shifts.
        </p>
      </div>
    </div>
  );
}
