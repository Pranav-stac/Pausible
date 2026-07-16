"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { NavAuthActions } from "@/components/NavAuthActions";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

const links = [
  { label: "How it works", href: "#how" },
  { label: "Personas", href: "#personas" },
  { label: "Your report", href: "#report" },
];

export function MarketingNav({ ctaHref }: { ctaHref: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header className={`marketing-nav-shell ${scrolled ? "is-scrolled" : ""}`}>
      <div className={`marketing-nav-glass ${scrolled ? "is-scrolled" : ""}`}>
        <Link
          href="/"
          className="marketing-nav-logo shrink-0 rounded-lg outline-offset-4"
          aria-label="Pausibl home"
        >
          <BrandLogo sizeClass="text-lg sm:text-xl" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-9 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <a
              key={l.href}
              className="marketing-nav-link font-medium text-[#4B5563] transition-colors hover:text-[#111827]"
              href={l.href}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <NavAuthActions />
          </div>
          <TrackedAssessmentLink
            href={ctaHref}
            placement="marketing_header_cta"
            className="marketing-nav-cta hidden items-center gap-2 rounded-[14px] border-[1.5px] border-[#0284C7]/20 bg-[image:var(--marketing-grad)] px-6 py-3 text-[17px] font-semibold text-white shadow-[0_14px_30px_-10px_rgba(99,102,241,0.5)] transition-[transform,box-shadow] hover:-translate-y-0.5 sm:inline-flex"
          >
            Get Started
            <span aria-hidden>→</span>
          </TrackedAssessmentLink>
          <button
            type="button"
            className="marketing-nav-menu-btn inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-800 lg:hidden"
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
        className={`marketing-nav-drawer pointer-events-auto fixed inset-x-0 z-40 border-t border-white/60 transition-[top] duration-300 lg:hidden ${scrolled ? "top-[68px]" : "top-[88px]"} ${mobileOpen ? "block" : "hidden"}`}
      >
        <div className="mx-auto flex max-w-[1160px] flex-col gap-2 px-5 py-5">
          <TrackedAssessmentLink
            href={ctaHref}
            placement="marketing_drawer_cta"
            className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[image:var(--marketing-grad)] px-6 py-3.5 text-base font-semibold text-white"
            onAfterTrack={() => setMobileOpen(false)}
          >
            Get Started →
          </TrackedAssessmentLink>
          <nav className="flex flex-col gap-0.5" aria-label="Mobile primary">
            {links.map((l) => (
              <a
                key={l.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827]"
                href={l.href}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-[#F3F4F6] pt-4">
            <NavAuthActions layout="drawer" />
          </div>
        </div>
      </div>
    </header>
  );
}
