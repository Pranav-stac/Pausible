export function AnnouncementBar() {
  return (
    <div className="border-b border-violet-200/70 bg-[#eef0ff] px-4 py-2.5 text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:text-center">
        <div className="flex items-start gap-2 sm:items-center">
          <span className="mt-0.5 shrink-0 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 sm:mt-0">
            New
          </span>
          <p className="text-left text-[12px] font-medium leading-snug sm:text-center sm:text-sm">
            Assessments are live — science-backed behavioral insights.
          </p>
        </div>
        <a
          href="#faq"
          className="shrink-0 text-left text-[12px] font-semibold text-violet-800 underline decoration-violet-400 underline-offset-[3px] sm:text-center sm:text-sm"
        >
          FAQs
        </a>
      </div>
    </div>
  );
}
