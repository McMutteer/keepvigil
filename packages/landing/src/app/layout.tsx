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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
