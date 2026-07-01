import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white px-4 py-12 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <BrandLogo variant="footer" />
            <p className="mt-3 text-sm text-[#6E7191]">Pause. Reflect. Accelerate.</p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#6E7191]" aria-label="Footer">
            <Link href="/terms" className="transition hover:text-[#0D1B2A]">
              About
            </Link>
            <Link href="/privacy" className="transition hover:text-[#0D1B2A]">
              Privacy
            </Link>
            <a href="mailto:hello@pausible.com" className="transition hover:text-[#0D1B2A]">
              Contact
            </a>
          </nav>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6">
          <p className="text-xs text-[#6E7191]">
            © {new Date().getFullYear()} {siteConfig.legalEntity}. A Wellness Intelligence Platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
