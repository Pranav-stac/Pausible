import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { MarketingReveal } from "@/components/marketing/MarketingReveal";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#F3F4F6] bg-white">
      <div className="mx-auto max-w-[1160px] px-6 py-[54px]">
        <MarketingReveal>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <BrandLogo variant="footer" />
              <p className="mt-2.5 text-sm font-medium tracking-[0.3px] text-[#9CA3AF]">Pause. Reflect. Accelerate.</p>
            </div>

            <nav className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] font-medium text-[#4B5563]" aria-label="Footer">
              <Link href="/terms" className="transition hover:text-[#111827]">
                About
              </Link>
              <Link href="/privacy" className="transition hover:text-[#111827]">
                Privacy
              </Link>
              <a href="mailto:hello@pausible.com" className="transition hover:text-[#111827]">
                Contact
              </a>
            </nav>
          </div>
        </MarketingReveal>

        <div className="mt-10 border-t border-[#F3F4F6] pt-[18px]">
          <p className="text-[13px] text-[#9CA3AF]">
            © {new Date().getFullYear()} {siteConfig.legalEntity}. A Wellness Intelligence Platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
