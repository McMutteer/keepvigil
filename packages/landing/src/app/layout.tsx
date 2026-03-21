import type { Metadata } from "next";
import Script from "next/script";
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
    icon: "/brand/favicon.svg",
  },
  openGraph: {
    title: "Vigil — Verifies that your PR does what it says it does",
    description:
      "Install the GitHub App. Open a PR. Get verification. Vigil checks that your code changes match your PR description — claims verified, undocumented changes surfaced, impact analyzed.",
    url: "https://keepvigil.dev",
    siteName: "Vigil",
    type: "website",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vigil — Verifies that your PR does what it says it does",
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
        <Script src="https://www.googletagmanager.com/gtag/js?id=AW-18032447128" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','AW-18032447128');`}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Vigil",
              description:
                "PR verification for GitHub. Vigil checks that code changes match PR descriptions — claims verified, undocumented changes surfaced, impact analyzed.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              url: "https://keepvigil.dev",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  name: "Free",
                  description: "Claims verification, undocumented change detection, credential scanning",
                },
                {
                  "@type": "Offer",
                  price: "19",
                  priceCurrency: "USD",
                  name: "Pro",
                  description: "Full verification with impact analysis and inline comments",
                },
                {
                  "@type": "Offer",
                  price: "49",
                  priceCurrency: "USD",
                  name: "Team",
                  description: "Full verification, team dashboard, SSO",
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
