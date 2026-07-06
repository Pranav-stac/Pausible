import { MarketingReveal } from "@/components/marketing/MarketingReveal";

const rows = [
  {
    label: "Secure payments",
    sub: "Stripe, Razorpay, PayPal",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
  },
  {
    label: "Private by default",
    sub: "Your history stays in your account",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Share on your terms",
    sub: "Spotlight cards when you choose",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9" />
      </svg>
    ),
  },
  {
    label: "15-20 minutes",
    sub: "No credit card to begin",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function TrustBar() {
  return (
    <section
      className="relative border-y border-slate-200/80 bg-white/80 px-4 py-8 backdrop-blur-sm sm:px-6"
      aria-label="Trust and security"
    >
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r, i) => (
          <MarketingReveal key={r.label} delay={i * 0.05}>
            <div className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-[#00C9C8]/12 to-[#2D82FF]/10 text-[#2D82FF]">
                {r.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0D1B2A]">{r.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#6E7191]">{r.sub}</p>
              </div>
            </div>
          </MarketingReveal>
        ))}
      </div>
    </section>
  );
}
