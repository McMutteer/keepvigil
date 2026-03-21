# Landing Page Navigation Redesign

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Full navigation and UX redesign for keepvigil.dev landing page

## Problem

The current landing page has critical navigation issues:

1. **Navbar only exists on the home page** — it's rendered inside `[locale]/page.tsx` instead of a shared layout. Pages like `/pricing`, `/about`, `/blog`, `/privacy`, `/terms` have no navbar.
2. **Docs are completely isolated** — `/docs/layout.tsx` has its own sidebar but no connection back to the main site. Users must use browser back button.
3. **No global footer** — `<CtaFooter>` is only on the home page.
4. **No way to navigate between pages** — from `/pricing` or `/about`, there's no way to reach other pages without manually editing the URL.

## Architecture: Route Groups

Restructure `[locale]/` using Next.js App Router route groups to provide shared layouts per section.

### Current Structure (broken)

```
app/[locale]/
├── layout.tsx          ← only LocaleProvider
├── page.tsx            ← Navbar hardcoded here
├── pricing/            ← no navbar
├── about/              ← no navbar
├── blog/               ← no navbar
├── privacy/            ← no navbar
├── terms/              ← no navbar
└── docs/
    ├── layout.tsx      ← isolated layout
    └── ...
```

### New Structure

```
app/[locale]/
├── layout.tsx              ← LocaleProvider (unchanged)
│
├── (marketing)/
│   ├── layout.tsx          ← Navbar + Footer (NEW)
│   ├── page.tsx            ← Home (remove Navbar from here)
│   ├── pricing/
│   ├── about/
│   ├── blog/
│   ├── privacy/
│   ├── terms/
│   └── checkout/
│
└── (docs)/
    └── docs/
        ├── layout.tsx      ← DocsNavbar + Sidebar (REFACTOR)
        └── ...
```

**Key points:**
- Parenthesized folder names `(marketing)` and `(docs)` do NOT affect URLs — `/en/pricing` stays `/en/pricing`
- `(marketing)/layout.tsx` wraps all marketing pages with Navbar + Footer automatically
- Any new marketing page inherits navigation without manual work
- `(docs)/docs/layout.tsx` uses the compact DocsNavbar + existing sidebar

## Components

### 1. Navbar (refactor — `components/navbar.tsx`)

**Desktop (≥ 640px):**
- Fixed top, z-50, glassmorphism (transparent at top → `bg-deep/80 + backdrop-blur-xl` on scroll + subtle border)
- Left: Logo → "Product ▾" dropdown → "Docs ▾" dropdown → Pricing → About → Blog
- Right: Language switcher (EN/ES) → Dashboard → "Install on GitHub" CTA (amber)
- Active page indicator: current page link highlighted in amber with 2px underline
- Dropdown parent highlighted when on a child page (e.g., "Docs" highlighted when on `/docs/signals`)

**Mega-dropdown for "Product"** — 3 columns:
- **Verification:** Claims Verifier, Undocumented Changes, Credential Scan (with short descriptions)
- **Analysis:** Coverage Mapper, Contract Checker, Diff Analyzer (with short descriptions)
- **Learn:** How It Works, Confidence Score, Changelog

**Dropdown for "Docs":**
- Getting Started, Configuration, Signals, Security

**Mobile (< 640px):**
- Top bar: Logo + "Install" CTA + hamburger icon
- Slide-over panel from right with backdrop + body scroll lock
- Sections with headers: Product (4 links), Resources (3 links), standalone links (Pricing, About, Dashboard)
- Bottom: Language switcher + GitHub icon + full-width CTA
- Close: ✕ button or backdrop click

**Glassmorphism behavior:**
- `scrollY === 0`: fully transparent background
- `scrollY > 60`: `bg-[#0f1729]/80 backdrop-blur-xl border-b border-white/[0.06]`
- Transition: 200ms ease

### 2. DocsNavbar (new — `components/docs/docs-navbar.tsx`)

Compact navbar for documentation pages:
- Left: Logo + "│" separator + "Documentation"
- Right: "← Back to site" (links to `/{locale}/`) → Language switcher → GitHub icon → "Install" CTA
- Same glassmorphism behavior as main Navbar
- No dropdowns, no mega-menu — keep it minimal for reading focus

### 3. Footer (new — `components/footer.tsx`)

Standard SaaS footer with 4 columns. Only in marketing pages (not docs).

**Layout:**
- Top section: 4 columns
  - Brand: Logo + tagline ("The verification layer for AI-assisted development.")
  - Product: Features, Pricing, Changelog, GitHub App
  - Resources: Documentation, Getting Started, Blog, GitHub
  - Company: About, Privacy Policy, Terms of Service
- Bottom section: Copyright + "Made with vigilance."
- Background: `#080d1a` (deeper than page bg)
- Border top: `border-white/[0.06]`
- All links locale-aware

**Mobile:** Columns stack vertically, collapsible sections.

### 4. Marketing Layout (new — `app/[locale]/(marketing)/layout.tsx`)

```tsx
export default function MarketingLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

Remove `<Navbar>` from `[locale]/(marketing)/page.tsx` (home). Remove `<CtaFooter>` from home page — the Footer component replaces it.

### 5. Docs Layout (refactor — `app/[locale]/(docs)/docs/layout.tsx`)

Replace current sidebar-only layout with:
```tsx
export default function DocsLayout({ children }) {
  return (
    <>
      <DocsNavbar />
      <div className="flex">
        <Sidebar />
        <main>{children}</main>
      </div>
    </>
  );
}
```

## UX Features

### 1. Page Transitions (CSS-only)

Smooth fade-in when navigating between pages. The navbar stays fixed; only the content below transitions.

- **Method:** CSS `@starting-style` + `transition` on the `<main>` content wrapper
- **Duration:** 200ms ease
- **Effect:** Opacity 0 → 1 on page mount
- **No JS library required** — pure CSS, works with Next.js App Router client navigation

### 2. Back-to-Top Button

Floating button that appears when user scrolls down.

- **Appears:** `scrollY > 400px`
- **Position:** Bottom-right corner, 24px from edges
- **Style:** 40px amber circle, ↑ icon, subtle shadow (`shadow-lg shadow-amber/20`)
- **Action:** `window.scrollTo({ top: 0, behavior: 'smooth' })`
- **Animation:** Fade-in/out with scale
- **Scope:** Marketing pages only (not docs)
- **Component:** `components/back-to-top.tsx` — included in `(marketing)/layout.tsx`

### 3. Active Page Indicator

The navbar highlights the current page.

- **Method:** Compare `usePathname()` against each nav link
- **Active style:** Text color amber (`#e8a820`) + 2px bottom border amber
- **Dropdown parents:** If pathname starts with `/docs/`, highlight "Docs" label
- **Already partially exists** in docs sidebar — extend to main navbar

### 4. Floating Mobile CTA

Persistent "Install on GitHub" button on mobile screens.

- **Visibility:** `< 640px` screens only (Tailwind `sm:hidden`)
- **Position:** Fixed bottom, full-width with padding
- **Background:** Gradient fade from transparent to `#080d1a`
- **Hides when:** Footer is visible (IntersectionObserver on footer element)
- **Scope:** Marketing pages only
- **Component:** Part of `(marketing)/layout.tsx`

### 5. Breadcrumbs

Navigation trail in docs and blog posts.

- **Scope:** Docs pages and blog posts only. Not on top-level pages (home, pricing, about)
- **Position:** Below DocsNavbar, above content. Subtle background `rgba(15,23,41,0.5)` with bottom border
- **Format:** `Docs › Signals › Claims Verifier` — each segment is a clickable link except the last (current page)
- **Generation:** Automatic from URL path + `docs-nav.ts` for human-readable titles
- **SEO:** Schema.org `BreadcrumbList` structured data via JSON-LD
- **Component:** `components/docs/breadcrumbs.tsx`

### 6. Reduced Motion

Respect user accessibility preferences.

- **Media query:** `@media (prefers-reduced-motion: reduce)` in `globals.css`
- **Disables:** Page transitions, smooth scroll, ScrollReveal animations, dropdown animations, back-to-top animation
- **Replaces with:** Instant state changes (no transition duration)
- **Impact:** ~5 lines of CSS

## Migration Notes

### Pages to Move

| Current Path | New Path | Notes |
|---|---|---|
| `[locale]/page.tsx` | `[locale]/(marketing)/page.tsx` | Remove `<Navbar>` and `<CtaFooter>` from component |
| `[locale]/pricing/` | `[locale]/(marketing)/pricing/` | No changes to component |
| `[locale]/about/` | `[locale]/(marketing)/about/` | No changes to component |
| `[locale]/blog/` | `[locale]/(marketing)/blog/` | No changes to component |
| `[locale]/privacy/` | `[locale]/(marketing)/privacy/` | No changes to component |
| `[locale]/terms/` | `[locale]/(marketing)/terms/` | No changes to component |
| `[locale]/checkout/` | `[locale]/(marketing)/checkout/` | No changes to component |
| `[locale]/docs/` | `[locale]/(docs)/docs/` | Refactor layout to include DocsNavbar |

### Files Created

| File | Type | Purpose |
|---|---|---|
| `app/[locale]/(marketing)/layout.tsx` | Layout | Wraps all marketing pages with Navbar + Footer |
| `components/footer.tsx` | Component | Global footer with 4 columns |
| `components/docs/docs-navbar.tsx` | Component | Compact navbar for docs |
| `components/docs/breadcrumbs.tsx` | Component | Auto-generated breadcrumb trail |
| `components/back-to-top.tsx` | Component | Floating scroll-to-top button |

### Files Modified

| File | Changes |
|---|---|
| `components/navbar.tsx` | Refactor mega-dropdown, add active indicator, improve mobile menu |
| `app/[locale]/(marketing)/page.tsx` | Remove `<Navbar>` and `<CtaFooter>` imports |
| `app/[locale]/(docs)/docs/layout.tsx` | Add DocsNavbar, keep sidebar |
| `globals.css` | Add reduced-motion media query, page transition styles |

### Files Removed

| File | Reason |
|---|---|
| `components/sections/cta-footer.tsx` | Replaced by `components/footer.tsx` |

## Testing

- [ ] All marketing pages render Navbar + Footer
- [ ] All docs pages render DocsNavbar + Sidebar + Breadcrumbs
- [ ] Navbar mega-dropdown opens/closes correctly (desktop)
- [ ] Mobile menu opens/closes with body scroll lock
- [ ] Active page indicator highlights correct link
- [ ] Dropdown parent highlights when on child page
- [ ] Language switcher works from all pages
- [ ] "Back to site" in docs navigates to locale home
- [ ] Breadcrumbs generate correct trail for all docs pages
- [ ] Back-to-top button appears/disappears at threshold
- [ ] Mobile CTA hides when footer is visible
- [ ] Page transitions are smooth (fade-in)
- [ ] `prefers-reduced-motion` disables all animations
- [ ] All links are locale-aware (`/{locale}/...`)
- [ ] Static export builds successfully
- [ ] No broken links after route group migration
- [ ] SEO: breadcrumb structured data renders in page source
- [ ] Mobile: all touch targets ≥ 44px
- [ ] Keyboard: all interactive elements focusable and operable
