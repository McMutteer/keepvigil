export interface NavItem {
  title: string;
  href: string;
  items?: NavItem[];
  badge?: "Pro" | "New";
}

export function getDocsNav(locale: string): NavItem[] {
  const p = `/${locale}/docs`;
  return [
    { title: "Getting Started", href: `${p}/getting-started` },
    { title: "Writing Test Plans", href: `${p}/writing-test-plans` },
    { title: "How It Works", href: `${p}/how-it-works` },
    { title: "Configuration", href: `${p}/configuration` },
    {
      title: "Signals",
      href: `${p}/signals`,
      items: [
        { title: "CI Bridge", href: `${p}/signals/ci-bridge` },
        { title: "Credential Scan", href: `${p}/signals/credential-scan` },
        { title: "Test Execution", href: `${p}/signals/test-execution` },
        { title: "Coverage Mapper", href: `${p}/signals/coverage-mapper` },
        {
          title: "Assertion Verifier",
          href: `${p}/signals/assertion-verifier`,
        },
        {
          title: "Plan Augmentor",
          href: `${p}/signals/plan-augmentor`,
        },
        {
          title: "Contract Checker",
          href: `${p}/signals/contract-checker`,
          badge: "Pro",
        },
        {
          title: "Diff vs Claims",
          href: `${p}/signals/diff-analysis`,
          badge: "Pro",
        },
        {
          title: "Gap Analysis",
          href: `${p}/signals/gap-analysis`,
          badge: "Pro",
        },
      ],
    },
    { title: "Confidence Score", href: `${p}/scoring` },
    { title: "Commands", href: `${p}/commands` },
    { title: "BYOLLM", href: `${p}/byollm`, badge: "Pro" },
    { title: "Notifications", href: `${p}/notifications` },
    { title: "Shell Allowlist", href: `${p}/shell-allowlist` },
    { title: "Security", href: `${p}/security` },
    { title: "Dashboard", href: `${p}/dashboard`, badge: "Pro" },
    { title: "Billing & Plans", href: `${p}/billing` },
    { title: "Changelog", href: `${p}/changelog` },
  ];
}

// Keep backward-compatible export for any existing references
export const docsNav = getDocsNav("en");

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

export function getPrevNext(currentPath: string, locale: string = "en") {
  // If path already has locale prefix, extract it
  const localeMatch = currentPath.match(/^\/([a-z]{2})\//);
  const effectiveLocale = localeMatch ? localeMatch[1] : locale;
  const nav = getDocsNav(effectiveLocale);
  const flat = flattenNav(nav);

  // Normalize path: if it doesn't have locale prefix, add it
  const normalizedPath = localeMatch
    ? currentPath
    : `/${effectiveLocale}${currentPath}`;

  const index = flat.findIndex((item) => item.href === normalizedPath);
  return {
    prev: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}
