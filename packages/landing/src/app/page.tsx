import type { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "http-equiv": "refresh",
  },
};

export default function RootPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace("/en");`,
        }}
      />
      <noscript>
        <p>
          Redirecting to <a href="/en">English</a>...
        </p>
      </noscript>
    </>
  );
}
