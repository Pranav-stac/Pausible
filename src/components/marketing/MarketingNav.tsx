"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { MyResultsNavLink } from "@/components/my-results/MyResultsHub";
import { NavAuthActions } from "@/components/NavAuthActions";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

const links = [
  { label: "Home", href: "#top" },
  { label: "How it works", href: "#journey" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingNav({ ctaHref }: { ctaHref: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 lg:gap-5">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2 rounded-lg outline-offset-4" aria-label="Pausible home">
          <BrandLogo heightClass="h-6 sm:h-8" priority withWordmark wordmarkClassName="text-[0.98rem] sm:text-lg" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 lg:gap-8 md:flex" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} className="text-sm font-medium text-slate-600 hover:text-slate-900" href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 sm:flex sm:gap-3">
            <MyResultsNavLink />
            <NavAuthActions />
          </div>
          <TrackedAssessmentLink
            href={ctaHref}
            placement="marketing_header_cta_compact"
            className="hidden min-h-[40px] items-center justify-center rounded-full bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm sm:inline-flex md:hidden"
          >
            Start&nbsp;→
          </TrackedAssessmentLink>
          <TrackedAssessmentLink
            href={ctaHref}
            placement="marketing_header_cta"
            className="hidden md:inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 lg:px-5"
          >
            Take assessment
            <span className="pl-1" aria-hidden>
              →
            </span>
          </TrackedAssessmentLink>
          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer: mirrors desktop links + auth */}
      <div
        id="marketing-mobile-menu"
        className={`border-t border-slate-100 bg-white md:hidden ${mobileOpen ? "block" : "hidden"}`}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4">
          <TrackedAssessmentLink
            href={ctaHref}
            placement="marketing_drawer_cta"
            className="flex w-full items-center justify-center rounded-2xl bg-slate-950 py-3.5 text-sm font-semibold text-white shadow-sm"
            onAfterTrack={() => setMobileOpen(false)}
          >
            Take assessment →
          </TrackedAssessmentLink>
          <nav className="flex flex-col gap-1" aria-label="Mobile primary">
            {links.map((l) => (
              <a
                key={l.href}
                className="rounded-xl px-3 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
                href={l.href}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-4">
            <MyResultsNavLink layout="drawer" />
            <NavAuthActions layout="drawer" />
          </div>
        </div>
      </div>
    </header>
  );
}
