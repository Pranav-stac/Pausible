"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { MyResultsNavLink } from "@/components/my-results/MyResultsHub";
import { NavAuthActions } from "@/components/NavAuthActions";
import { GRADIENT_BG, GRADIENT_BG_HOVER } from "@/components/marketing/marketing-brand";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

const links = [
  { label: "How it works", href: "#journey" },
  { label: "Personas", href: "#personas" },
  { label: "Your report", href: "#report" },
];

const ctaClass = `inline-flex min-h-[40px] items-center justify-center rounded-lg ${GRADIENT_BG} ${GRADIENT_BG_HOVER} px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-2px_rgba(45,130,255,0.4)] transition`;

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
    <header className="sticky top-0 z-40 border-b border-slate-100/80 bg-white/90 backdrop-blur-lg">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-lg outline-offset-4" aria-label="Pausibl home">
          <BrandLogo sizeClass="text-lg sm:text-xl" />
        </Link>

        <nav className="hidden items-center justify-center gap-8 md:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              className="text-sm font-medium text-[#4D4D4D] transition hover:text-[#0D1B2A]"
              href={l.href}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 lg:flex lg:gap-3">
            <MyResultsNavLink />
            <NavAuthActions />
          </div>
          <TrackedAssessmentLink href={ctaHref} placement="marketing_header_cta" className={`hidden sm:inline-flex ${ctaClass}`}>
            Get Started
          </TrackedAssessmentLink>
          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        id="marketing-mobile-menu"
        className={`border-t border-slate-100 bg-white md:hidden ${mobileOpen ? "block" : "hidden"}`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5">
          <TrackedAssessmentLink
            href={ctaHref}
            placement="marketing_drawer_cta"
            className={`flex w-full items-center justify-center ${ctaClass} py-3.5`}
            onAfterTrack={() => setMobileOpen(false)}
          >
            Get Started
          </TrackedAssessmentLink>
          <nav className="flex flex-col gap-0.5" aria-label="Mobile primary">
            {links.map((l) => (
              <a
                key={l.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#4D4D4D] hover:bg-[#F7F9FB] hover:text-[#0D1B2A]"
                href={l.href}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-4">
            <MyResultsNavLink layout="drawer" />
            <NavAuthActions layout="drawer" />
          </div>
        </div>
      </div>
    </header>
  );
}
