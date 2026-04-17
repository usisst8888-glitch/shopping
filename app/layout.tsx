import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteConfigFull } from "@/lib/site";
import { NavigationProgress } from "@/components/ui/navigation-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteConfigFull();
  const design = site.design;

  const title = design?.seo_title || site.name;
  const description = design?.seo_description || site.description || '';

  return {
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description,
    keywords: design?.seo_keywords?.split(',').map((k) => k.trim()) ?? [],
    openGraph: {
      title,
      description,
      siteName: site.name,
      ...(design?.seo_og_image ? { images: [{ url: design.seo_og_image, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(design?.seo_og_image ? { images: [design.seo_og_image] } : {}),
    },
    ...(design?.seo_favicon ? { icons: { icon: design.seo_favicon } } : {}),
    verification: {
      ...(design?.seo_google_verification ? { google: design.seo_google_verification } : {}),
      ...(design?.seo_naver_verification ? { other: { 'naver-site-verification': design.seo_naver_verification } } : {}),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
