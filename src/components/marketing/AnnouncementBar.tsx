export function AnnouncementBar() {
  return (
    <div className="border-b border-violet-200/70 bg-[#eef0ff] px-4 py-2.5 text-slate-800">
      <div className="mx-auto flex max-w-7xl flex-row items-center gap-3 sm:justify-center sm:text-center md:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:flex-none sm:items-center sm:justify-center">
          <span className="mt-0.5 shrink-0 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 sm:mt-0">
            New
          </span>
          <p className="min-w-0 flex-1 text-left text-[12px] font-medium leading-snug max-sm:truncate sm:flex-none sm:whitespace-normal sm:text-center sm:text-sm md:text-sm">
            Assessments are live — science-backed behavioral insights.
          </p>
        </div>
        <a
          href="#faq"
          className="shrink-0 self-center text-[12px] font-semibold whitespace-nowrap text-violet-800 underline decoration-violet-400 underline-offset-[3px] sm:text-sm"
        >
          FAQs
        </a>
      </div>
    </div>
  );
}
