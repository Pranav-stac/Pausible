import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import {
  APP_CONTENT,
  APP_HEADER,
  APP_HEADER_INNER,
  APP_LINK_BACK,
  APP_PAGE_BG_SOFT,
} from "@/components/marketing/marketing-brand";

type AppPageShellProps = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  stepLabel?: string;
  headerRight?: ReactNode;
  softBg?: boolean;
  className?: string;
  contentClassName?: string;
};

export function AppPageShell({
  children,
  backHref,
  backLabel = "← Back",
  stepLabel,
  headerRight,
  softBg = true,
  className = "",
  contentClassName = "",
}: AppPageShellProps) {
  return (
    <main className={`${softBg ? APP_PAGE_BG_SOFT : "min-h-screen bg-white scheme-light"} ${className}`}>
      <header className={APP_HEADER}>
        <div className={APP_HEADER_INNER}>
          <Link href="/" className="shrink-0 rounded-lg outline-offset-4" aria-label="Pausibl home">
            <BrandLogo sizeClass="text-lg sm:text-xl" />
          </Link>

          {stepLabel ? (
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6E7191] sm:block">
              {stepLabel}
            </span>
          ) : null}

          <div className="flex shrink-0 items-center gap-3">
            {headerRight}
            {backHref ? (
              <Link href={backHref} className={APP_LINK_BACK}>
                {backLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`${APP_CONTENT} ${contentClassName}`}>{children}</div>
    </main>
  );
}
