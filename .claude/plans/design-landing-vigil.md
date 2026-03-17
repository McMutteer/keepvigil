# Vigil — Landing Page Design

**Phases complete:** 5 / 6
**Last updated:** 2026-03-17

## Project Status

| Phase | Name | Status | Artifact | Gate |
|-------|------|--------|----------|------|
| 0 | Conversation | Complete | design-conversation-vigil.md | User approved |
| 1 | Soul | Complete | design-soul-vigil.md | User approved mirror |
| 2 | Landscape | Complete | design-landscape-vigil.md | Auto (research) |
| 3 | Light | Complete | design-system-vigil.md | User approved system |
| 4 | Blueprint | Complete | (in this file) | User approved narrative |
| 5 | Lens | Complete | (sections in this file) | Per-section |
| 6 | Beam | Pending | (checklist in this file) | All sections pass |

---

## Phase 4: Blueprint — Narrative Architecture

### The Story

```
Developer arrives → recognizes the guilt ("I merge AI PRs without verifying")
→ sees a new concept (confidence score) → examines evidence (real PR output)
→ understands the mechanism (7 signals) → sees simplicity (3-line config)
→ checks pricing (free to start) → installs
```

### Narrative Beats

| Beat | Section | Role |
|------|---------|------|
| Hook | Hero | Show the score. The number IS the hook — 82/100 is instantly graspable |
| Problem | Problem | Make the invisible habit visible. "You merge without verifying" |
| Solution + Evidence | How It Works | The 7 signals — what Vigil actually does |
| Evidence | Live Output | The real PR comment as it appears on GitHub |
| Mechanism | Configuration | .vigil.yml — how simple it is to configure |
| Invitation | Pricing + CTA | Free to start, Pro for power users |

### Section Order

```
S0: Design System Setup (CSS variables, Tailwind config, fonts, base styles)
S1: Navbar
S2: Hero
S3: Problem
S4: How It Works (Signals)
S5: Live Output (Evidence)
S6: Configuration
S7: Pricing
S8: Footer + Final CTA
```

---

## Phase 5: Section Specifications

---

### Section 0: Design System Setup

**Status:** Pending
**Depends on:** Design system document only
**Estimated complexity:** Low

#### Narrative Role
Foundation. No visible content — this sets up everything other sections use.

#### Scope
- Next.js 15 App Router project initialization
- Tailwind CSS 4 with `@theme` block from `design-system-vigil.md`
- Geist Sans + Geist Mono via `next/font/local`
- Global CSS with all design tokens as CSS custom properties
- Base `<html>` and `<body>` styles (bg-deep, text-primary, antialiased)
- Favicon from `public/brand/favicon.svg`
- Meta tags: title, description, OG, Twitter card
- Copy brand assets from `.claude/identity/` to `public/brand/`

#### Content
- `<title>`: "Vigil — Confidence scores for AI-generated PRs"
- `<meta description>`: "Know which PRs need your eyes. Vigil gives every AI-generated pull request a confidence score from 0-100."
- OG image: generate or use a static card with the score visual

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `app/layout.tsx` | Root layout with fonts, meta, base styles |
| Create | `app/globals.css` | Tailwind v4 with @theme tokens |
| Create | `app/page.tsx` | Landing page (initially empty, sections added incrementally) |
| Create | `public/brand/*.svg` | Copy from `.claude/identity/` |
| Create | `tailwind.config.ts` | If needed for v4 compatibility |
| Create | `next.config.ts` | Next.js config |

#### Acceptance Criteria
- [ ] `pnpm dev` starts without errors
- [ ] Page renders with bg-deep background and correct fonts
- [ ] Favicon appears in browser tab
- [ ] All design tokens available as Tailwind utilities
- [ ] Lighthouse Performance: 100 (empty page)

---

### Section 1: Navbar

**Status:** Pending
**Depends on:** S0 (Design System)
**Estimated complexity:** Low

#### Narrative Role
Orientation. The visitor knows where they are (Vigil) and what they can do (Install).

#### Visual Description
Fixed to top. Transparent background with subtle blur backdrop on scroll. Full width. Content constrained to max-width 1200px. Logo left, CTA right. Nothing in between — silence.

#### Content
- Logo: Vigil icon (from `public/brand/icon.svg`) + "vigil" text in Geist Sans 500, 18px
- Right side: Ghost button "GitHub" (links to repo) + Primary button "Install on GitHub" (links to Marketplace)
- No hamburger menu on mobile — just logo + install button (GitHub link hidden on mobile)

#### Layout Specification
- Container: max-width 1200px, padding 0 24px
- Height: 64px
- Position: fixed, top 0, z-50
- Background: transparent → `bg-deep/80` with `backdrop-blur-md` after scroll (JS: IntersectionObserver on hero)
- Border bottom: `--border-subtle` only after scroll

#### Design System Tokens Used
- `--bg-deep` (with alpha for blur)
- `--text-primary` (logo text)
- `--accent` (install button)
- `--border-subtle` (scroll border)
- `--transition-fast` (background change)

#### Micro-Interactions
- Background transition: transparent → blurred on scroll past hero
- Install button: standard primary hover
- No other animations

#### Accessibility Requirements
- All links keyboard-navigable
- Logo links to top of page (anchor)
- Skip-to-content link as first focusable element
- Buttons have visible focus states
- ARIA: `<nav aria-label="Main">`

#### Acceptance Criteria
- [ ] Renders at 1440px, 1024px, 768px, 375px
- [ ] Logo + install button visible at all breakpoints
- [ ] Background blur activates on scroll
- [ ] Skip-to-content link works
- [ ] All interactive elements keyboard-accessible

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/navbar.tsx` | Navbar component |
| Modify | `app/page.tsx` | Import Navbar |

---

### Section 2: Hero

**Status:** Pending
**Depends on:** S0, S1
**Estimated complexity:** High

#### Narrative Role
The hook. In 3 seconds the developer must think: "Wait — a confidence score for my PRs? That exists?" The hero doesn't explain — it SHOWS. The score box IS the product demo.

#### Visual Description
Full viewport height (100vh minus navbar). Two-column layout on desktop: left side is text, right side is the animated score card. On mobile: stacked, text first, score card below.

Left column (text): Pre-headline in Label style (amber, uppercase), headline in Display, subheadline in Subhead (text-secondary), and primary CTA button.

Right column (score card): A stylized representation of Vigil's PR comment — the confidence score box with signals. NOT a screenshot — a designed, animated recreation that's sharper than a screenshot would be. Dark card (`bg-surface`) with `border-subtle`, containing:
- Score: large "82" in amber with "/100" in text-muted, with count-up animation
- Recommendation badge: "Safe to merge" with success color
- Signal list with status icons (✅ ❌ ⚠️ 🔒) and names
- Each signal appears with stagger animation

The score card floats with a subtle amber glow (`accent-glow`) behind it.

#### Content
- Pre-headline: "FOR DEVELOPERS WHO USE AI AGENTS"
- Headline: "Confidence scores for AI-generated PRs"
- Subheadline: "Know which PRs need your eyes. Vigil gives every pull request a score from 0 to 100 — so you merge with evidence, not blind trust."
- CTA: "Install on GitHub" (primary amber button) + "View on GitHub" (ghost button)
- Score card signals:
  - ✅ CI checks passed (3/3)
  - ✅ No credentials in diff
  - ✅ Test execution: 5/6 passed
  - ⚠️ Test coverage: 60% of files
  - 🔒 Diff analysis (Pro)
  - 🔒 Gap analysis (Pro)
- Score: 82/100
- Recommendation: "Safe to merge"

#### Layout Specification
- Container: max-width 1200px, padding 0 24px
- Desktop (≥1024px): 2 columns, 55% text / 45% score card, gap 64px, vertically centered
- Tablet (768-1023px): 2 columns, 50/50, gap 32px
- Mobile (<768px): single column, text → score card, gap 32px
- Min-height: calc(100vh - 64px)
- Vertical centering within the section

#### Design System Tokens Used
- `--bg-deep` (section background)
- `--bg-surface` (score card)
- `--border-subtle` (card border)
- `--accent` (score number, pre-headline, CTA)
- `--accent-glow` (card glow)
- `--text-primary` (headline)
- `--text-secondary` (subheadline)
- `--text-muted` ("/100" suffix)
- `--success`, `--warning` (signal status)
- Display, Subhead, Label, Code type levels

#### Micro-Interactions
- **Score count-up:** 0 → 82 over 1.5s with easing, triggered on mount (above fold, no scroll needed)
- **Signal stagger:** Each signal fades in 100ms after previous, starting after score reaches target
- **Recommendation badge:** Fades in after all signals
- **Reduced motion:** Score shows 82 immediately, no stagger, all visible at once
- **CTA hover:** Standard primary button hover

#### Accessibility Requirements
- Heading hierarchy: `<h1>` for headline
- Score card: `aria-label="Vigil confidence score demonstration showing 82 out of 100"`
- CTA buttons keyboard-accessible with visible focus
- Count-up animation respects `prefers-reduced-motion`
- Contrast: amber on bg-deep = 7.8:1 ✅

#### Acceptance Criteria
- [ ] Renders correctly at 1440px, 1024px, 768px, 375px
- [ ] Score count-up animation works
- [ ] Signal stagger animation works
- [ ] Reduced motion: all content visible immediately
- [ ] CTA buttons work and are keyboard-accessible
- [ ] Score card has subtle amber glow
- [ ] No horizontal scroll on mobile
- [ ] `<h1>` present

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/hero.tsx` | Hero section |
| Create | `components/score-card.tsx` | Animated score card |
| Modify | `app/page.tsx` | Import Hero |

---

### Section 3: Problem

**Status:** Pending
**Depends on:** S0
**Estimated complexity:** Low

#### Narrative Role
Make the invisible visible. Most developers don't KNOW they have this problem — merging AI PRs without verifying is an unconscious habit. This section names it. The moment of recognition: "Oh. I do that."

#### Visual Description
Centered text section. Narrow container (720px). No graphics, no illustrations — just words. The typography does the work. A single powerful statement, followed by a brief expansion.

The section feels like a pause. Generous vertical padding. Dark background continues. The text is the only element demanding attention.

#### Content
- Headline: "Your AI agent writes beautiful test plans. You never run them."
- Body: "Claude Code, Cursor, Copilot — they generate PRs with twelve-point test plans, each checkbox a promise of quality. You skim them. You approve. You merge. Not because you're careless — because there's no easy way to verify. The gap between what your agent promised and what actually got tested grows with every PR."
- No CTA in this section. Let the weight sit.

#### Layout Specification
- Container: max-width 720px, centered, padding 0 24px
- Section padding: 96px top/bottom (desktop), 64px (tablet), 48px (mobile)
- Headline: Heading level (36px desktop, 24px mobile), `text-primary`
- Body: Body level (16px), `text-secondary`, max-width 600px, centered
- Gap between headline and body: 24px

#### Design System Tokens Used
- `--bg-deep` (background, continuous)
- `--text-primary` (headline)
- `--text-secondary` (body)
- Heading, Body type levels

#### Micro-Interactions
- Fade-up on scroll entry (translateY 20px, opacity 0→1, 400ms)
- Reduced motion: visible immediately

#### Accessibility Requirements
- `<h2>` for headline
- Contrast: text-primary on bg-deep = 13.5:1 ✅
- Contrast: text-secondary on bg-deep = 7.2:1 ✅

#### Acceptance Criteria
- [ ] Renders at all breakpoints
- [ ] Text is centered and readable
- [ ] Scroll reveal animation works
- [ ] Reduced motion: content visible immediately
- [ ] WCAG AA contrast ✅

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/problem.tsx` | Problem section |
| Modify | `app/page.tsx` | Import Problem |

---

### Section 4: How It Works (Signals)

**Status:** Pending
**Depends on:** S0
**Estimated complexity:** Medium

#### Narrative Role
The mechanism. Now that the developer feels the problem, show how Vigil solves it — not with vague promises but with a concrete system of 7 signals, each measuring something specific.

#### Visual Description
Section headline centered. Below it, a grid of signal cards. Each card is a `bg-surface` panel with `border-subtle`, containing: a status icon (emoji or colored dot), the signal name in Code font, whether it needs LLM, and a one-line description.

The cards are arranged in a 3-column grid on desktop (2 rows: 3+3, last card centered or spanning), 2 columns on tablet, single column on mobile.

A subtle divider separates free signals from Pro signals. Pro signals have a `🔒` badge and slightly different border (`border-active` at low opacity).

#### Content

**Headline:** "Seven signals. One score."
**Subheadline:** "Vigil doesn't just run tests. It collects multiple independent signals about your PR and combines them into a weighted confidence score."

**Free Signals:**

| Signal | Description |
|--------|-------------|
| CI Bridge | Maps test plan items to your GitHub Actions results. If CI already verified it, Vigil knows. |
| Credential Scan | Scans the diff for hardcoded secrets, API keys, and passwords. Catches what code review misses. |
| Test Execution | Runs shell commands from the test plan in a sandboxed Docker container. Real verification. |
| Coverage Mapper | Checks if changed files have corresponding test files. Finds the blind spots. |
| Assertion Verifier | Reads your actual source files and verifies claims like "Dockerfile uses non-root USER." |

**Pro Signals (BYOLLM):**

| Signal | Description |
|--------|-------------|
| Diff vs Claims | LLM compares what the PR actually changed against what the test plan promises. Finds the gaps between words and code. |
| Gap Analysis | LLM identifies areas of the code that changed but aren't covered by any test plan item. The unknown unknowns. |

**Score formula note (small text):** "Each signal has a weight. The confidence score is a weighted average from 0 to 100. Any critical failure caps the score at 70 — one problem means it's never 'safe to merge.'"

#### Layout Specification
- Container: max-width 1200px, padding 0 24px
- Section padding: 96px / 64px / 48px
- Headline: centered, Heading level
- Subheadline: centered, Subhead level, max-width 720px, text-secondary
- Cards grid: 3 columns desktop, 2 tablet, 1 mobile, gap 16px
- Card internal: padding 24px, border-radius-md
- Signal name: Code font, text-primary, 15px
- Description: Body font, text-secondary, 14px
- Divider between Free and Pro: `--border-subtle`, label "Pro — Bring Your Own LLM" in Label style

#### Design System Tokens Used
- `--bg-deep` (section bg)
- `--bg-surface` (cards)
- `--border-subtle` (card borders)
- `--border-active` (Pro card borders, low opacity)
- `--accent` (Pro badge)
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--radius-md` (cards)
- Code, Body, Label type levels

#### Micro-Interactions
- Cards: stagger fade-up on scroll (100ms between each)
- Reduced motion: all cards visible immediately

#### Accessibility Requirements
- `<h2>` for section headline
- Cards are not interactive — no ARIA roles needed beyond semantic HTML
- Pro badge: visible label, not icon-only
- Contrast verified for all text/background combinations

#### Acceptance Criteria
- [ ] Renders at all breakpoints (3 col → 2 col → 1 col)
- [ ] Free/Pro separation clear
- [ ] Stagger animation works
- [ ] Reduced motion: all visible immediately
- [ ] All text meets WCAG AA contrast

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/signals.tsx` | Signals section |
| Create | `components/signal-card.tsx` | Individual signal card |
| Modify | `app/page.tsx` | Import Signals |

---

### Section 5: Live Output (Evidence)

**Status:** Pending
**Depends on:** S0
**Estimated complexity:** Medium

#### Narrative Role
Proof. The developer has heard the pitch — now show them exactly what Vigil produces. This is the "I want to see it working" moment. Show the actual PR comment as it appears on GitHub, but as a designed recreation (sharper, more readable than a screenshot).

#### Visual Description
A centered, wide recreation of a GitHub PR comment. Dark card (`bg-surface`) with the Vigil icon as "avatar," followed by the comment body in a code/markdown styled block.

The comment shows:
1. The confidence score header (82/100 with recommendation)
2. The signal breakdown table
3. A collapsible "Test Plan Details" section (shown expanded)
4. Action items

This should look like a GitHub comment but styled in Vigil's design language — not a pixel-perfect GitHub clone, but recognizable as "this is what appears on your PR."

#### Content

**Headline:** "This appears on every PR."
**Subheadline:** "No dashboard. No separate tool. The results live where you already work — right on the pull request."

**Comment recreation content:**

```
🛡️ Vigil Confidence Score: 82/100 — Safe to merge ✅

> Credential Scan ✅ • CI Bridge ✅ • Test Execution ⚠️ • Coverage ✅ • Assertion ✅

| Signal | Score | Status | Details |
|--------|-------|--------|---------|
| Credential Scan | 100 | ✅ Passed | No secrets detected |
| CI Bridge | 100 | ✅ Passed | 3/3 check runs passed |
| Test Execution | 67 | ⚠️ Partial | 4/6 items passed |
| Coverage Mapper | 75 | ⚠️ Partial | 3/4 changed files covered |
| Assertion Verifier | 100 | ✅ Passed | 📁 5 files verified |
| Diff vs Claims | 85 | ✅ Passed | 1 minor gap found |
| Gap Analysis | 90 | ✅ Passed | No critical gaps |

### Action Items
**Must Fix:**
- ❌ `npm test` exits with code 1 — fix failing test

**Consider:**
- ⚠️ `src/utils/auth.ts` changed but has no test file
```

#### Layout Specification
- Container: max-width 900px, centered, padding 0 24px
- Section padding: 96px / 64px / 48px
- Headline + subheadline: centered, above the card
- Comment card: max-width 800px, `bg-surface`, `border-subtle`, `radius-lg`, padding 32px
- Internal: styled markdown table using Code font for data, Body for text
- Signal scores: colored per status (success green, warning amber, failure red)

#### Design System Tokens Used
- `--bg-deep`, `--bg-surface`, `--code-bg`
- `--border-subtle`, `--radius-lg`
- `--success`, `--warning`, `--failure`
- `--accent` (score number)
- Code, Body type levels

#### Micro-Interactions
- Card fades up on scroll
- No internal animations — the data speaks for itself
- Reduced motion: visible immediately

#### Accessibility Requirements
- `<h2>` for section headline
- Table: proper `<table>`, `<thead>`, `<tbody>` semantics
- Status icons: accompanied by text labels (not icon-only)
- Color not sole indicator of status (text label always present)

#### Acceptance Criteria
- [ ] Renders at all breakpoints
- [ ] Table is readable on mobile (horizontal scroll if needed, or stacked cards)
- [ ] Signal status colors correct
- [ ] Accessible table markup
- [ ] WCAG AA contrast for all text

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/evidence.tsx` | Evidence section |
| Create | `components/pr-comment.tsx` | PR comment recreation |
| Modify | `app/page.tsx` | Import Evidence |

---

### Section 6: Configuration

**Status:** Pending
**Depends on:** S0
**Estimated complexity:** Low

#### Narrative Role
Remove the last objection: "Is this hard to set up?" Show that it's 3 lines of YAML. The developer sees configuration they recognize — `.yml` in their repo root — and knows exactly what to expect.

#### Visual Description
Two-column layout: left side is text explaining the config, right side is a beautifully styled code block showing `.vigil.yml`.

The code block uses `code-bg` background, syntax highlighted in a minimal palette (strings in accent, keys in text-primary, comments in text-muted). The code block has a header bar with the filename (`.vigil.yml`) and a subtle copy button.

#### Content

**Headline:** "Three lines to start. Infinite control when you need it."
**Subheadline:** "Drop a `.vigil.yml` in your repo root. That's it. Vigil works out of the box — configure only what you want to customize."

**Code block (minimal):**
```yaml
version: 1

# That's it. Vigil runs free-tier signals
# on every PR automatically.
```

**Code block (full, below or toggled):**
```yaml
version: 1

timeouts:
  shell: 300
  api: 30

skip:
  categories:
    - visual

shell:
  allow:
    - "npm test"
    - "pytest"

notifications:
  on: failure
  urls:
    - https://hooks.slack.com/services/T.../B.../xxx

# Pro: bring your own LLM
llm:
  provider: groq
  model: llama-3.3-70b-versatile
  api_key: gsk_your_key_here
```

**Below the code blocks (small text):** "Zero config required for Free tier. Add `llm:` to unlock Pro signals with your own API key."

#### Layout Specification
- Container: max-width 1200px, padding 0 24px
- Section padding: 96px / 64px / 48px
- Desktop: 2 columns, 45% text / 55% code, gap 48px
- Mobile: stacked, text → code, gap 32px
- Code block: `code-bg`, `radius-code`, padding 24px, overflow-x auto
- Code header: filename + copy button in `bg-elevated`

#### Design System Tokens Used
- `--bg-deep` (section bg)
- `--code-bg`, `--code-text` (code block)
- `--bg-elevated` (code header)
- `--accent` (YAML string values, comment highlight)
- `--text-muted` (comments)
- `--radius-code`
- Code, Body type levels

#### Micro-Interactions
- Section: fade-up on scroll
- Copy button: click → "Copied!" tooltip for 2s
- Reduced motion: visible immediately

#### Accessibility Requirements
- `<h2>` for headline
- Code block: `<pre><code>` with `aria-label="vigil.yml configuration example"`
- Copy button: `aria-label="Copy configuration to clipboard"`

#### Acceptance Criteria
- [ ] Renders at all breakpoints
- [ ] Code syntax highlighting correct
- [ ] Copy button works
- [ ] Readable on mobile (code scrolls horizontally if needed)

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/config.tsx` | Config section |
| Create | `components/code-block.tsx` | Styled code block with copy |
| Modify | `app/page.tsx` | Import Config |

---

### Section 7: Pricing

**Status:** Pending
**Depends on:** S0
**Estimated complexity:** Medium

#### Narrative Role
The invitation. Remove ambiguity about cost. Lead with Free (no barrier), highlight Pro (the full experience), show Team (future growth). The Free tier should feel generous, not crippled.

#### Visual Description
Three pricing cards side by side on desktop, stacked on mobile. Pro card is visually elevated — slightly larger, with `border-active` (amber border), and a "Recommended" badge.

All cards have `bg-surface`, `border-subtle` (Pro has `border-active`). Each card lists: plan name, price, description, feature list with checkmarks, and CTA button (Ghost for Free/Team, Primary amber for Pro).

#### Content

**Headline:** "Start free. Scale when you're ready."

**Free card:**
- Name: "Free"
- Price: "$0"
- Period: "forever"
- Description: "Immediate value, zero config."
- Features:
  - ✅ CI Bridge — verify GitHub Actions results
  - ✅ Credential Scan — catch hardcoded secrets
  - ✅ Coverage Mapper — find untested files
  - ✅ Test Execution — sandbox verification
  - ✅ Assertion Verifier — file content checks
  - ✅ Unlimited public repos
- CTA: "Install Free" (ghost button)

**Pro card (recommended):**
- Name: "Pro"
- Price: "$19"
- Period: "/month"
- Description: "The full confidence score."
- Badge: "Recommended" in accent color
- Features:
  - Everything in Free, plus:
  - ✅ Diff vs Claims — LLM gap detection
  - ✅ Gap Analysis — find untested changes
  - ✅ BYOLLM — use your own API key
  - ✅ Webhook notifications (Slack/Discord)
  - ✅ Priority support
- CTA: "Start Pro Trial" (primary amber button)

**Team card:**
- Name: "Team"
- Price: "$49"
- Period: "/month"
- Description: "For teams managing agents at scale."
- Features:
  - Everything in Pro, plus:
  - ✅ Shared dashboard
  - ✅ Custom scoring rules
  - ✅ SSO / SAML
  - ✅ Org-wide configuration
  - ✅ Dedicated support
- CTA: "Contact Us" (ghost button)

**Below cards (small, centered):** "All plans include unlimited PRs. BYOLLM means you control LLM costs — typically < $0.01 per PR."

#### Layout Specification
- Container: max-width 1000px, centered, padding 0 24px
- Section padding: 96px / 64px / 48px
- Desktop: 3 columns, equal width, gap 16px
- Tablet: 3 columns, slightly compressed
- Mobile: stacked, gap 16px
- Pro card: 4px extra vertical size (extends top by 4px), `border-active`
- Card internal: padding 32px, `radius-md`
- Price: Display size for the number, text-muted for period
- Feature list: Body size, checkmarks in `text-muted`, text in `text-secondary`

#### Design System Tokens Used
- `--bg-deep` (section bg)
- `--bg-surface` (cards)
- `--border-subtle` (Free/Team cards)
- `--border-active` (Pro card)
- `--accent` (Pro badge, Pro CTA, price highlight)
- `--text-primary` (plan names, prices)
- `--text-secondary` (features, descriptions)
- `--text-muted` (period, checkmarks)
- `--radius-md`
- Display (price numbers), Body, Label type levels

#### Micro-Interactions
- Cards: stagger fade-up on scroll
- Pro card badge: subtle pulse or glow (very subtle — one amber pulse on entry, then static)
- Reduced motion: all visible immediately, no pulse

#### Accessibility Requirements
- `<h2>` for section headline
- Each card: `role="region"` with `aria-label` (e.g., "Free plan")
- Feature checkmarks: decorative (hidden from screen readers), text is sufficient
- Price: semantic — not just visual styling
- CTA buttons: clear, descriptive text

#### Acceptance Criteria
- [ ] Renders at all breakpoints (3 col → stacked)
- [ ] Pro card visually elevated
- [ ] All CTA buttons work
- [ ] Keyboard navigation through cards
- [ ] WCAG AA contrast on all text

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/pricing.tsx` | Pricing section |
| Create | `components/pricing-card.tsx` | Individual pricing card |
| Modify | `app/page.tsx` | Import Pricing |

---

### Section 8: Footer + Final CTA

**Status:** Pending
**Depends on:** S0
**Estimated complexity:** Low

#### Narrative Role
The final invitation + closure. One last CTA for developers who scrolled all the way. Plus the obligatory footer links.

#### Visual Description
Two parts:

**Final CTA band:** Centered text with headline, one sentence, and amber CTA button. Slightly elevated background (`bg-surface`) to separate from pricing. Clean, spacious.

**Footer:** Below the CTA band. Minimal. Logo, copyright, and links. Single row on desktop, stacked on mobile. `bg-deep` background (matches page).

#### Content

**CTA band:**
- Headline: "Merge with confidence."
- Body: "Install Vigil in 30 seconds. Free forever for open source."
- CTA: "Install on GitHub" (primary amber button)

**Footer links:**
- Left: Vigil icon + "vigil" text
- Center: "GitHub" · "Documentation" · "MIT License"
- Right: "Built by McMutteer"

**Copyright:** "© 2026 Vigil. Open source under MIT."

#### Layout Specification
- CTA band: `bg-surface`, padding 64px top/bottom, centered text, max-width 600px
- Footer: `bg-deep`, padding 24px, max-width 1200px
- Desktop footer: single row, justify-between
- Mobile footer: stacked, centered, gap 16px

#### Design System Tokens Used
- `--bg-surface` (CTA band)
- `--bg-deep` (footer)
- `--text-primary` (CTA headline)
- `--text-secondary` (CTA body)
- `--text-muted` (footer links, copyright)
- `--accent` (CTA button)
- `--border-subtle` (separator between CTA and footer)

#### Micro-Interactions
- CTA band: fade-up on scroll
- No footer animations

#### Accessibility Requirements
- `<footer>` semantic element
- All links keyboard-navigable
- External links: `target="_blank"` with `rel="noopener noreferrer"`
- `aria-label` on icon-only elements

#### Acceptance Criteria
- [ ] Renders at all breakpoints
- [ ] CTA button works
- [ ] Footer links functional
- [ ] Semantic `<footer>` element
- [ ] Copyright visible

#### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `components/sections/cta-footer.tsx` | Final CTA + Footer |
| Modify | `app/page.tsx` | Import Footer |

---

## Hub-Ready Constants

Export these from a constants file for `/add-hub-service` consumption:

```typescript
export const LANDING_STATS = [
  { label: "Signals", value: "7" },
  { label: "Score Range", value: "0-100" },
  { label: "Tests", value: "777+" },
  { label: "Setup", value: "30 seconds" },
];

export const LANDING_FEATURES = [
  "CI Bridge — map test plan items to GitHub Actions results",
  "Credential Scan — detect hardcoded secrets in diffs",
  "Test Execution — sandbox verification of shell commands",
  "Coverage Mapper — find changed files without tests",
  "Assertion Verifier — LLM-powered file content verification",
  "Diff vs Claims — compare changes against test plan promises",
  "Gap Analysis — identify untested code changes",
];
```

---

## Phase 6: Beam (Verification Checklist)

To be completed after all sections are implemented.

### Design Fidelity
- [ ] All colors use design system tokens — no hardcoded hex
- [ ] Typography scale exact — no ad-hoc sizes
- [ ] Spacing grid respected — no arbitrary pixels
- [ ] Component primitives consistent (radius, borders, transitions)
- [ ] Button styles match spec (primary, ghost, text)

### Responsive
- [ ] Desktop (1440px): correct
- [ ] Laptop (1024px): reflows
- [ ] Tablet (768px): single-column where specified, 44px touch targets
- [ ] Mobile (375px): no horizontal scroll, readable without zoom

### Accessibility
- [ ] WCAG AA all text/background pairs
- [ ] All interactive elements keyboard-navigable
- [ ] All images have alt text
- [ ] All animations respect prefers-reduced-motion
- [ ] Lighthouse Accessibility: 100
- [ ] Logical heading hierarchy (h1 → h2 → h3, no skips)
- [ ] Focus states visible on all interactive elements
- [ ] Skip-to-content link

### Performance
- [ ] Lighthouse Performance: 95+
- [ ] FCP < 1.0s, LCP < 2.0s
- [ ] Page weight < 500KB (excluding fonts)
- [ ] CLS: 0
- [ ] Fonts: swap + preload via next/font
- [ ] No images below fold loaded eagerly

### Brand Consistency
- [ ] Feels nocturnal, silent, precise
- [ ] Amber is the only warm color
- [ ] No illustrations — evidence and code only
- [ ] Copy tone: direct, technical, zero marketing fluff
- [ ] The Sentinel icon appears in navbar + footer

### Conversion
- [ ] Primary CTA ("Install on GitHub") above the fold
- [ ] CTA repeated 3 times (navbar, hero, footer CTA band)
- [ ] CTA copy specific and action-oriented
- [ ] Free tier prominent — no barrier to entry

### SEO & Meta
- [ ] `<title>` under 60 chars ✅ ("Vigil — Confidence scores for AI-generated PRs" = 51)
- [ ] `<meta description>` under 155 chars ✅
- [ ] OG tags with title, description, image
- [ ] Twitter card tags
- [ ] Canonical URL
- [ ] Favicon (SVG)
- [ ] robots.txt
- [ ] sitemap.xml
