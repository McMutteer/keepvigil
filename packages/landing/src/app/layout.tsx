import type { Metadata } from "next";
import localFont from "next/font/local";
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
  title: "Vigil — Confidence scores for AI-generated PRs",
  description:
    "Know which PRs need your eyes. Vigil gives every AI-generated pull request a confidence score from 0-100.",
  metadataBase: new URL("https://keepvigil.dev"),
  icons: {
    icon: "/brand/favicon.svg",
  },
  openGraph: {
    title: "Vigil — Confidence scores for AI-generated PRs",
    description:
      "Know which PRs need your eyes. Vigil gives every AI-generated pull request a confidence score from 0-100.",
    url: "https://keepvigil.dev",
    siteName: "Vigil",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigil — Confidence scores for AI-generated PRs",
    description:
      "Know which PRs need your eyes. Vigil gives every AI-generated pull request a confidence score from 0-100.",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Vigil",
              description:
                "Confidence scores for AI-generated pull requests. Vigil gives every PR a score from 0-100.",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Web",
              url: "https://keepvigil.dev",
              offers: [
                {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  name: "Free",
                  description: "5 signals, unlimited PRs, unlimited repos",
                },
                {
                  "@type": "Offer",
                  price: "19",
                  priceCurrency: "USD",
                  name: "Pro",
                  description: "All 7 signals with BYOLLM",
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
        {children}
      </body>
    </html>
  );
}
