const rows = [
  { label: "Secure payments", sub: "Stripe · Razorpay · PayPal" },
  { label: "Private by default", sub: "Your history stays in your account" },
  { label: "Share on your terms", sub: "Spotlight cards when you choose" },
  { label: "Human support", sub: "Email help when you need it" },
];

export function TrustBar() {
  return (
    <section className="border-y border-slate-200/80 bg-white px-4 py-8 sm:px-6" aria-label="Trust and security">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <p className="text-sm font-semibold text-[#0D1B2A]">{r.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6E7191]">{r.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
