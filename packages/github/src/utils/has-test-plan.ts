/**
 * Simple check for markdown checkboxes in PR body.
 * Returns true if the body contains at least one checkbox item (- [ ] or - [x]).
 * This is a lightweight gate — the full parser lives in Section 3.
 */
const CHECKBOX_PATTERN = /^[-*]\s*\[[ xX]\]/m;

export function hasTestPlan(body: string | null | undefined): boolean {
  if (!body) return false;
  return CHECKBOX_PATTERN.test(body);
}
