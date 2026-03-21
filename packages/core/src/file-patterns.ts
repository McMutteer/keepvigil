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

/** Check if a file is a non-source file that should be excluded */
export function isNonSource(filePath: string): boolean {
  return NON_SOURCE_PATTERNS.some((p) => p.test(filePath));
}

/** Check if a file is itself a test file */
export function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some((p) => p.test(filePath));
}
