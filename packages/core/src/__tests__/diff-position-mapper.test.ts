import { describe, it, expect } from "vitest";
import { buildDiffPositionMap, mapToReviewComment } from "../diff-position-mapper.js";

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index abc123..def456 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,8 @@ export function authenticate() {
   const token = getToken();
   if (!token) return null;
+  // Rate limit check
+  if (isRateLimited(token)) return null;
   return validateToken(token);
 }
diff --git a/src/rate-limiter.ts b/src/rate-limiter.ts
new file mode 100644
--- /dev/null
+++ b/src/rate-limiter.ts
@@ -0,0 +1,5 @@
+import rateLimit from "express-rate-limit";
+
+export const limiter = rateLimit({
+  windowMs: 15 * 60 * 1000,
+  max: 100,
+});`;

describe("buildDiffPositionMap", () => {
  it("maps added lines in existing file", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const authMap = map.get("src/auth.ts");
    expect(authMap).toBeDefined();
    // Line 12 = first added line ("// Rate limit check")
    expect(authMap!.has(12)).toBe(true);
    // Line 13 = second added line
    expect(authMap!.has(13)).toBe(true);
  });

  it("maps lines in new file", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const rlMap = map.get("src/rate-limiter.ts");
    expect(rlMap).toBeDefined();
    // Lines 1-6 should all be mapped
    expect(rlMap!.has(1)).toBe(true);
    expect(rlMap!.has(5)).toBe(true);
  });

  it("maps context lines too", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const authMap = map.get("src/auth.ts");
    // Line 10 = first context line ("const token = getToken();")
    expect(authMap!.has(10)).toBe(true);
  });

  it("returns empty map for empty diff", () => {
    const map = buildDiffPositionMap("");
    expect(map.size).toBe(0);
  });

  it("handles multiple files", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    expect(map.size).toBe(2);
    expect(map.has("src/auth.ts")).toBe(true);
    expect(map.has("src/rate-limiter.ts")).toBe(true);
  });
});

describe("mapToReviewComment", () => {
  it("returns location for a line in the diff", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const result = mapToReviewComment(map, "src/auth.ts", 12);
    expect(result).not.toBeNull();
    expect(result!.path).toBe("src/auth.ts");
    expect(result!.position).toBeGreaterThan(0);
  });

  it("returns null for a line not in the diff", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const result = mapToReviewComment(map, "src/auth.ts", 999);
    expect(result).toBeNull();
  });

  it("returns null for a file not in the diff", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const result = mapToReviewComment(map, "src/unknown.ts", 1);
    expect(result).toBeNull();
  });

  it("finds nearby lines within ±3 tolerance", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    // Line 12 is in the diff; try line 14 (within ±3 of 12)
    const result = mapToReviewComment(map, "src/auth.ts", 14);
    // Should find line 13 (within range)
    expect(result).not.toBeNull();
    expect(result!.path).toBe("src/auth.ts");
  });

  it("normalizes ./ prefix", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const result = mapToReviewComment(map, "./src/auth.ts", 12);
    expect(result).not.toBeNull();
    expect(result!.path).toBe("src/auth.ts");
  });

  it("returns correct positions for new file", () => {
    const map = buildDiffPositionMap(SAMPLE_DIFF);
    const line1 = mapToReviewComment(map, "src/rate-limiter.ts", 1);
    const line3 = mapToReviewComment(map, "src/rate-limiter.ts", 3);
    expect(line1).not.toBeNull();
    expect(line3).not.toBeNull();
    // line 3 should have a higher position than line 1
    expect(line3!.position).toBeGreaterThan(line1!.position);
  });
});
