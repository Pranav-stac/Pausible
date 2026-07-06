import Link from "next/link";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import {
  APP_BODY,
  APP_HEADING_MD,
  APP_LINK_BACK,
  APP_PAGE_BG,
  MARKETING_CONTAINER,
} from "@/components/marketing/marketing-brand";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export default function PrivacyPage() {
  return (
    <main className={APP_PAGE_BG}>
      <MarketingNav ctaHref="/intro" />
      <div className={`${MARKETING_CONTAINER} px-4 py-16 sm:px-6 sm:py-20`}>
        <Link href="/" className={APP_LINK_BACK}>
          ← Home
        </Link>
        <h1 className={`mt-6 ${APP_HEADING_MD}`}>Privacy</h1>
        <p className={`mt-4 max-w-2xl ${APP_BODY}`}>
          Placeholder privacy policy. Replace with jurisdiction-specific disclosure. Anonymous sessions may use a
          browser-scoped identifier; optional Google linking is governed by Firebase Auth.
        </p>
      </div>
      <SiteFooter />
    </main>
  );
}
