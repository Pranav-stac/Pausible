"use client";

const nav: { id: string; label: string; sub?: string }[] = [
  { id: "overview", label: "Overview", sub: "KPIs & trends" },
  { id: "attempts", label: "Attempts", sub: "Funnel detail" },
  { id: "assessments", label: "Assessments", sub: "Visual + JSON" },
  { id: "users", label: "Users", sub: "Roles & activity" },
  { id: "analytics", label: "Analytics", sub: "Visitors & events" },
  { id: "settings", label: "Settings", sub: "Billing & export" },
];

export function AdminSidebar({
  tab,
  onTab,
  onExportMenu,
  onAfterNavigate,
  onLogout,
}: {
  tab: string;
  onTab: (t: (typeof nav)[number]["id"]) => void;
  onExportMenu: () => void;
  /** Close mobile drawer after picking a section */
  onAfterNavigate?: () => void;
  onLogout: () => void;
}) {
  const navigate = (id: (typeof nav)[number]["id"]) => {
    onTab(id);
    onAfterNavigate?.();
  };

  return (
    <aside className="flex h-full w-full max-w-[17rem] shrink-0 flex-col border-r border-slate-200 bg-white text-slate-900 shadow-sm lg:max-w-none lg:shadow-none">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">Console</div>
        <div className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Pausible</div>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">Operations & content</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.id as (typeof nav)[number]["id"])}
            className={`flex w-full flex-col rounded-xl px-3 py-2.5 text-left text-sm transition ${
              tab === item.id
                ? "border border-sky-200 bg-sky-50 font-medium text-sky-950"
                : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="font-semibold">{item.label}</span>
            {item.sub ? <span className="text-[10px] text-slate-500">{item.sub}</span> : null}
          </button>
        ))}
        <div className="my-3 border-t border-slate-100" />
        <button
          type="button"
          onClick={() => {
            onExportMenu();
            onAfterNavigate?.();
          }}
          className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-left text-sm font-semibold text-amber-950 hover:bg-amber-50"
        >
          <span>Export hub</span>
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-900">
            CSV + XLSX
          </span>
        </button>
      </nav>
      <div className="space-y-2 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => {
            onLogout();
            onAfterNavigate?.();
          }}
          className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
        >
          Log out
        </button>
        <p className="text-center text-[10px] leading-relaxed text-slate-400">
          Firestore admin role on <code className="rounded bg-slate-100 px-0.5 text-[9px]">users/&lt;uid&gt;</code>
        </p>
      </div>
    </aside>
  );
}
