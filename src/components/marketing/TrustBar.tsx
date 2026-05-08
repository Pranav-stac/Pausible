const rows = [
  { label: "Payments", sub: "Stripe · Razorpay · PayPal" },
  { label: "Data vault", sub: "Private history per attempt" },
  { label: "Share surface", sub: "Latest spotlight only" },
  { label: "Support window", sub: "Email + in-app routing" },
];

export function TrustBar() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/80 px-1.5 py-10 sm:px-2 lg:py-12">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`text-center text-sm text-slate-600 md:border-l md:border-slate-200 md:first:border-l-0 ${i === 0 ? "" : ""}`}
          >
            <div className="font-semibold text-slate-900">{r.label}</div>
            <div className="mt-1 text-xs text-slate-500">{r.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
