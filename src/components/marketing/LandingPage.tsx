import { ResumePendingAssessmentNavigation } from "@/components/marketing/ResumePendingAssessmentNavigation";
import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Hero } from "@/components/marketing/Hero";
import { Journey } from "@/components/marketing/Journey";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PersonasSection } from "@/components/marketing/PersonasSection";
import { ReportSection } from "@/components/marketing/ReportSection";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { TrustBar } from "@/components/marketing/TrustBar";
import { VideoOverview } from "@/components/marketing/VideoOverview";

const START = "/intro";

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <ResumePendingAssessmentNavigation />
      <MarketingNav ctaHref={START} />
      <Hero ctaHref={START} />
      <TrustBar />
      <Journey />
      <VideoOverview />
      <PersonasSection ctaHref={START} />
      <ReportSection />
      <FinalCTA href={START} />
      <SiteFooter />
    </main>
  );
}
