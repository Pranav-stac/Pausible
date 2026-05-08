import { AnnouncementBar } from "@/components/marketing/AnnouncementBar";
import { DemoCTA } from "@/components/marketing/DemoCTA";
import { FeatureBand } from "@/components/marketing/FeatureBand";
import { Hero } from "@/components/marketing/Hero";
import { Journey } from "@/components/marketing/Journey";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { StatsStrip } from "@/components/marketing/StatsStrip";
import { Testimonials } from "@/components/marketing/Testimonials";
import { Faq } from "@/components/marketing/Faq";

const START = "/assessment/default";

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <AnnouncementBar />
      <MarketingNav ctaHref={START} />
      <Hero ctaHref={START} />
      <Journey />
      <StatsStrip />
      <FeatureBand />
      <Testimonials />
      <DemoCTA href={START} />
      <Faq />
      <SiteFooter />
    </main>
  );
}
