export interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
  badge?: "Pro" | "New";
}

export const docsNav: NavItem[] = [
  { title: "Getting Started", href: "/docs/getting-started" },
  { title: "Writing Test Plans", href: "/docs/writing-test-plans" },
  { title: "How It Works", href: "/docs/how-it-works" },
  { title: "Configuration", href: "/docs/configuration" },
  {
    title: "Signals",
    href: "/docs/signals",
    items: [
      { title: "CI Bridge", href: "/docs/signals/ci-bridge" },
      { title: "Credential Scan", href: "/docs/signals/credential-scan" },
      { title: "Test Execution", href: "/docs/signals/test-execution" },
      { title: "Coverage Mapper", href: "/docs/signals/coverage-mapper" },
      {
        title: "Assertion Verifier",
        href: "/docs/signals/assertion-verifier",
      },
      {
        title: "Plan Augmentor",
        href: "/docs/signals/plan-augmentor",
      },
      {
        title: "Contract Checker",
        href: "/docs/signals/contract-checker",
        badge: "Pro",
      },
      {
        title: "Diff vs Claims",
        href: "/docs/signals/diff-analysis",
        badge: "Pro",
      },
      {
        title: "Gap Analysis",
        href: "/docs/signals/gap-analysis",
        badge: "Pro",
      },
    ],
  },
  { title: "Confidence Score", href: "/docs/scoring" },
  { title: "Commands", href: "/docs/commands" },
  { title: "BYOLLM", href: "/docs/byollm", badge: "Pro" },
  { title: "Notifications", href: "/docs/notifications" },
  { title: "Shell Allowlist", href: "/docs/shell-allowlist" },
  { title: "Security", href: "/docs/security" },
  { title: "Dashboard", href: "/docs/dashboard", badge: "Pro" },
  { title: "Billing & Plans", href: "/docs/billing" },
  { title: "Changelog", href: "/docs/changelog" },
];

function flattenNav(items: NavItem[]): NavItem[] {
  const result: NavItem[] = [];
  for (const item of items) {
    result.push(item);
    if (item.items) {
      result.push(...flattenNav(item.items));
    }
  }
  return result;
}

export function getPrevNext(currentPath: string) {
  const flat = flattenNav(docsNav);
  const index = flat.findIndex((item) => item.href === currentPath);
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
