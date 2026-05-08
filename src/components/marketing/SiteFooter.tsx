import Link from "next/link";
import { siteConfig } from "@/config/site";
import { BrandLogo } from "@/components/BrandLogo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white px-1.5 py-12 sm:px-2">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-3">
            <BrandLogo heightClass="h-8 sm:h-9" withWordmark wordmarkClassName="text-lg sm:text-xl" />
          </div>
          <p className="max-w-md text-sm text-slate-600">{siteConfig.tagline}</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
          <Link href="/terms" className="hover:text-slate-900">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
          <a href="mailto:hello@pausible.com" className="hover:text-slate-900">
            Contact
          </a>
          <Link href="/admin" className="font-medium text-slate-800 hover:text-slate-950">
            Admin
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {siteConfig.legalEntity}. Crafted for clarity—not clinical vibes.
      </div>
    </footer>
  );
}
