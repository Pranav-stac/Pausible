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
  applicationName: siteConfig.siteName,
  title: {
    default: `${siteConfig.siteName} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.siteName}`,
  },
  description:
    "Take the Pausible fitness behavioral assessment. Structured scoring, premium results, secure payments, and shareable highlights.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/favicon/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteConfig.siteName,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    title: `${siteConfig.siteName} — Fitness behavioral assessment`,
    description: siteConfig.tagline,
    siteName: siteConfig.siteName,
    locale: "en_US",
    images: [
      {
        url: "/favicon/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: `${siteConfig.siteName} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.siteName} — Fitness behavioral insights`,
    description: siteConfig.tagline,
    images: ["/favicon/web-app-manifest-512x512.png"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased scheme-light`}
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
