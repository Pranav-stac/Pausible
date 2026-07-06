import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { PersonasSection } from "@/components/marketing/PersonasSection";
import { ReportSection } from "@/components/marketing/ReportSection";
import { ResumePendingAssessmentNavigation } from "@/components/marketing/ResumePendingAssessmentNavigation";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { VideoOverview } from "@/components/marketing/VideoOverview";

const START = "/intro";

export function LandingPage() {
  return (
    <main className="marketing-page relative min-h-screen overflow-x-hidden bg-white font-[family-name:var(--font-outfit)]">
      <div className="marketing-grain" aria-hidden />
      <ResumePendingAssessmentNavigation />
      <MarketingNav ctaHref={START} />
      <Hero ctaHref={START} />
      <VideoOverview />
      <HowItWorks />
      <PersonasSection ctaHref={START} />
      <ReportSection />
      <FinalCTA href={START} />
      <SiteFooter />
    </main>
  );
}
