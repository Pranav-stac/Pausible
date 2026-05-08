import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppProviders } from "@/app/providers";
import { ReferralCapture } from "@/components/ReferralCapture";
import { siteConfig } from "@/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${siteConfig.siteName} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.siteName}`,
  },
  description:
    "Take the Pausible fitness behavioral assessment. Structured scoring, premium results, secure payments, and shareable highlights.",
  openGraph: {
    title: `${siteConfig.siteName} — Fitness behavioral assessment`,
    description: siteConfig.tagline,
    siteName: siteConfig.siteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden bg-white font-sans text-slate-900">
        <AppProviders>
          <Suspense fallback={null}>
            <ReferralCapture />
          </Suspense>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
