/**
 * Shared file classification patterns used by multiple signals.
 * Single source of truth to avoid subtle divergence between risk-scorer,
 * coverage-mapper, and credential-scanner.
 */

/** Extensions and patterns that are NOT source code (excluded from analysis) */
export const NON_SOURCE_PATTERNS = [
  /\.md$/i,
  /\.json$/i,
  /\.ya?ml$/i,
  /\.toml$/i,
  /\.lock$/i,
  /\.lockb$/i,
  /\.env/i,
  /\.example$/i,
  /\.gitignore$/,
  /\.eslintrc/,
  /\.prettierrc/,
  /tsconfig/i,
  /vitest\.config/i,
  /jest\.config/i,
  /Dockerfile/i,
  /docker-compose/i,
  /^\.github\//,
  /^\.gitlab-ci/,
  /^LICENSE/i,
  /^Makefile$/i,
  /^Cargo\.toml$/i,
  /^go\.mod$/i,
  /^go\.sum$/i,
  /\.config\.[jt]sx?$/i,
  /\.config\.mjs$/i,
  /\.config\.cjs$/i,
  /nginx\.conf$/i,
  /^entrypoint\.sh$/i,
  // Static assets — no tests expected
  /\.css$/i,
  /\.scss$/i,
  /\.svg$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.ico$/i,
  /\.woff2?$/i,
  /\.ttf$/i,
  /\.eot$/i,
  /\.webp$/i,
  /\.avif$/i,
  // HTML templates and manifests
  /\.html$/i,
  /manifest\.json$/i,
  /sitemap\.xml$/i,
  /robots\.txt$/i,
];

/** Test file patterns (these ARE tests, not source needing coverage) */
export const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/__tests__\//,
  /\/test_[^/]+\.py$/,
  /\/tests?\//,
  /_test\.go$/,
];

/**
 * Patterns for presentation-only files that rarely need unit tests.
 * These are typically React page components, layouts, and UI files
 * where testing adds minimal value (no business logic).
 */
export const PRESENTATION_PATTERNS = [
  // Next.js route files (pages, layouts, loading states, error boundaries)
  /\/app\/(.+\/)?page\.[jt]sx?$/,
  /\/app\/(.+\/)?layout\.[jt]sx?$/,
  /\/app\/(.+\/)?loading\.[jt]sx?$/,
  /\/app\/(.+\/)?error\.[jt]sx?$/,
  /\/app\/(.+\/)?not-found\.[jt]sx?$/,
  // i18n dictionaries (pure data, no logic)
  /\/i18n\/.*\.[jt]sx?$/,
  /\/dictionaries\/.*\.[jt]sx?$/,
  /\/locales\/.*\.[jt]sx?$/,
];

/** Check if a file is a non-source file that should be excluded */
export function isNonSource(filePath: string): boolean {
  return NON_SOURCE_PATTERNS.some((p) => p.test(filePath));
}

/** Check if a file is a presentation-only file (tests optional, not penalized) */
export function isPresentationFile(filePath: string): boolean {
  return PRESENTATION_PATTERNS.some((p) => p.test(filePath));
}

/** Check if a file is itself a test file */
export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}
