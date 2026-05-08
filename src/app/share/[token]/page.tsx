import type { Metadata } from "next";
import { Suspense } from "react";
import { SharePublicClient } from "@/components/SharePublicClient";
import { siteConfig } from "@/config/site";

export async function generateMetadata(props: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await props.params;
  return {
    title: `${siteConfig.siteName} spotlight`,
    description: siteConfig.tagline,
    openGraph: {
      title: `${siteConfig.siteName} — spotlight`,
      description: "A shareable behavioral fitness snapshot.",
      type: "article",
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/share/${token}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteConfig.siteName} spotlight`,
      description: siteConfig.tagline,
    },
  };
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading…</div>}>
      <SharePublicClient />
    </Suspense>
  );
}
