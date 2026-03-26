import { describe, it, expect } from "vitest";
import { isNonSource, isTestFile, isPresentationFile } from "../file-patterns.js";

describe("isNonSource", () => {
  it("identifies static assets", () => {
    expect(isNonSource("styles/globals.css")).toBe(true);
    expect(isNonSource("public/icon.svg")).toBe(true);
    expect(isNonSource("public/og-image.png")).toBe(true);
    expect(isNonSource("public/photo.jpg")).toBe(true);
    expect(isNonSource("assets/logo.webp")).toBe(true);
    expect(isNonSource("fonts/Geist.woff2")).toBe(true);
    expect(isNonSource("fonts/Geist.woff")).toBe(true);
    expect(isNonSource("fonts/old.ttf")).toBe(true);
    expect(isNonSource("public/favicon.ico")).toBe(true);
  });

  it("identifies HTML and web manifests", () => {
    expect(isNonSource("public/index.html")).toBe(true);
    expect(isNonSource("public/manifest.json")).toBe(true);
    expect(isNonSource("public/sitemap.xml")).toBe(true);
    expect(isNonSource("public/robots.txt")).toBe(true);
  });

  it("does NOT flag source code as non-source", () => {
    expect(isNonSource("src/index.ts")).toBe(false);
    expect(isNonSource("src/components/navbar.tsx")).toBe(false);
    expect(isNonSource("app/api/route.ts")).toBe(false);
    expect(isNonSource("lib/utils.js")).toBe(false);
  });
});

describe("isPresentationFile", () => {
  it("identifies Next.js page components", () => {
    expect(isPresentationFile("src/app/page.tsx")).toBe(true);
    expect(isPresentationFile("src/app/[locale]/page.tsx")).toBe(true);
    expect(isPresentationFile("src/app/[locale]/pricing/page.tsx")).toBe(true);
    expect(isPresentationFile("packages/landing/src/app/[locale]/(marketing)/page.tsx")).toBe(true);
  });

  it("identifies Next.js layout components", () => {
    expect(isPresentationFile("src/app/layout.tsx")).toBe(true);
    expect(isPresentationFile("src/app/[locale]/layout.tsx")).toBe(true);
    expect(isPresentationFile("src/app/[locale]/(docs)/layout.tsx")).toBe(true);
  });

  it("identifies Next.js special files", () => {
    expect(isPresentationFile("src/app/loading.tsx")).toBe(true);
    expect(isPresentationFile("src/app/error.tsx")).toBe(true);
    expect(isPresentationFile("src/app/not-found.tsx")).toBe(true);
  });

  it("identifies i18n files", () => {
    expect(isPresentationFile("src/i18n/dictionaries/en.ts")).toBe(true);
    expect(isPresentationFile("src/i18n/dictionaries/es.ts")).toBe(true);
    expect(isPresentationFile("src/locales/en.json")).toBe(false); // .json is non-source, caught before
    expect(isPresentationFile("src/dictionaries/fr.ts")).toBe(true);
  });

  it("does NOT flag regular components as presentation", () => {
    expect(isPresentationFile("src/components/navbar.tsx")).toBe(false);
    expect(isPresentationFile("src/utils/score.ts")).toBe(false);
    expect(isPresentationFile("src/services/api.ts")).toBe(false);
    expect(isPresentationFile("packages/core/src/coverage-mapper.ts")).toBe(false);
  });
});

describe("isTestFile", () => {
  it("identifies test files", () => {
    expect(isTestFile("src/__tests__/foo.test.ts")).toBe(true);
    expect(isTestFile("src/foo.spec.tsx")).toBe(true);
    expect(isTestFile("tests/unit/bar.test.js")).toBe(true);
    expect(isTestFile("test_handler.py")).toBe(false); // needs leading /
    expect(isTestFile("pkg/handler_test.go")).toBe(true);
  });
});
