import type { Metadata } from "next";
import localFont from "next/font/local";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vigil — Verifies that your PR does what it says it does",
  description:
    "Install the GitHub App. Open a PR. Get verification. Vigil checks that your code changes match your PR description — claims verified, undocumented changes surfaced, impact analyzed.",
  metadataBase: new URL("https://keepvigil.dev"),
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "32x32" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/brand/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#0f1729",
    "color-scheme": "dark",
    "msapplication-TileColor": "#0f1729",
  },
  openGraph: {
    title: "Vigil — Verifies that your PR does what it says it does",
    description:
      "Install the GitHub App. Open a PR. Get verification. Vigil checks that your code changes match your PR description — claims verified, undocumented changes surfaced, impact analyzed.",
    url: "https://keepvigil.dev",
    siteName: "Vigil",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vigil — The verification layer for AI-assisted development",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigil — Verifies that your PR does what it says it does",
    description:
      "Install the GitHub App. Open a PR. Get verification. Vigil checks that your code changes match your PR description — claims verified, undocumented changes surfaced, impact analyzed.",
    images: ["/brand/og-image.png"],
  },
  alternates: {
    canonical: "https://keepvigil.dev",
    languages: {
      en: "https://keepvigil.dev/en",
      es: "https://keepvigil.dev/es",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Vigil",
              description:
                "The verification layer for AI-assisted development. Vigil checks that code changes match PR descriptions — 8 signals including claims verification, credential scanning, risk scoring, and impact analysis.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              url: "https://keepvigil.dev",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  name: "Free",
                  description: "Claims verification, undocumented change detection, credential scanning, coverage mapping",
                },
                {
                  "@type": "Offer",
                  price: "12",
                  priceCurrency: "USD",
                  priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: "12",
                    priceCurrency: "USD",
                    unitText: "developer/month",
                    billingIncrement: 1,
                  },
                  name: "Pro",
                  description: "All 8 signals, contract checking, diff analysis, inline review comments",
                },
                {
                  "@type": "Offer",
                  price: "24",
                  priceCurrency: "USD",
                  priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: "24",
                    priceCurrency: "USD",
                    unitText: "developer/month",
                    billingIncrement: 1,
                  },
                  name: "Team",
                  description: "All Pro features, team dashboard, priority support, SSO",
                },
              ],
              author: {
                "@type": "Organization",
                name: "Vigil",
                url: "https://keepvigil.dev",
              },
            }),
          }}
        />
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
