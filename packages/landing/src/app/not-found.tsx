import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Vigil",
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-24 sm:py-32 text-center">
      <p className="text-6xl font-semibold text-accent mb-4">404</p>
      <h1 className="text-2xl font-semibold text-text-primary mb-3">
        Page not found
      </h1>
      <p className="text-text-secondary mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[6px] text-sm font-medium bg-accent text-[#080d1a] hover:bg-accent-hover transition-colors duration-150"
      >
        Back to home
      </a>
    </div>
  );
}
