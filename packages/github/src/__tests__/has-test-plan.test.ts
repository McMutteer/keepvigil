import { describe, it, expect } from "vitest";
import { hasTestPlan } from "../utils/has-test-plan.js";

describe("hasTestPlan", () => {
  it("returns true for unchecked checkbox items", () => {
    expect(hasTestPlan("- [ ] Verify login works")).toBe(true);
  });

  it("returns true for checked checkbox items", () => {
    expect(hasTestPlan("- [x] Build passes")).toBe(true);
  });

  it("returns true for uppercase X checkbox", () => {
    expect(hasTestPlan("- [X] Tests pass")).toBe(true);
  });

  it("returns true for asterisk-style checkboxes", () => {
    expect(hasTestPlan("* [ ] API returns 200")).toBe(true);
  });

  it("returns true when checkboxes are embedded in longer text", () => {
    const body = `## Summary
Some changes here.

## Test Plan
- [ ] Verify the homepage loads
- [ ] Check API endpoint returns 200
- [x] Build succeeds`;
    expect(hasTestPlan(body)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(hasTestPlan("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasTestPlan(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasTestPlan(undefined)).toBe(false);
  });

  it("returns false for text without checkboxes", () => {
    expect(hasTestPlan("This PR adds a new feature.")).toBe(false);
  });

  it("returns false for bullet lists without checkboxes", () => {
    expect(hasTestPlan("- Added feature A\n- Fixed bug B")).toBe(false);
  });

  it("returns false for inline brackets that are not checkboxes", () => {
    expect(hasTestPlan("Use array[0] to access the first element")).toBe(false);
  });
});
