# Vigil — Design System (Phase 3)

**Date:** 2026-03-17
**Status:** Approved
**Derived from:** `.claude/identity/brand.md` + `design-soul-vigil.md`

Every value here is concrete — an implementing agent writes CSS variables directly from this document.

---

## Color Palette

### Background Scale (the night has layers)

```css
--bg-deep:       #080d1a;     /* Page base. The 3am sky — deeper than brand primary so logo has contrast */
--bg-surface:    #0f1729;     /* Cards, panels. Midnight Navy from brand — elevated surfaces */
--bg-elevated:   #1a2744;     /* Hover states, active borders. Deep Watch from brand */
--bg-subtle:     #1e2d4a;     /* Borders, dividers, separators. One step lighter */
```

### Text Scale (never pure white — aggressive on dark)

```css
--text-primary:  #e2e8f0;     /* Headings, body. Slate Light from brand. Contrast 13.5:1 on bg-deep */
--text-secondary:#94a3b8;     /* Supporting text. Slate Gray from brand. Contrast 7.2:1 on bg-deep */
--text-muted:    #64748b;     /* Labels, timestamps, metadata. Contrast 4.6:1 on bg-deep */
```

### Accent (the vigil candle — only warm color)

```css
--accent:        #e8a820;     /* Vigil Amber. CTAs, highlights, the score. The candle flame */
--accent-hover:  #f0b429;     /* Brighter on hover. The flame grows */
--accent-glow:   rgba(232, 168, 32, 0.15);  /* Subtle glow around important elements */
```

### Semantic

```css
--success:       #22c55e;     /* Signals that pass. Green-500 */
--failure:       #ef4444;     /* Signals that fail. Red-500 */
--warning:       #f59e0b;     /* Review needed. Amber-500 (close to accent but more orange) */
--info:          #3b82f6;     /* Informational. Blue-500 */
```

### Code

```css
--code-bg:       #060a14;     /* Darker than bg-deep. Code blocks sink into the page */
--code-text:     #c4cee0;     /* Slightly brighter than secondary for readability */
```

### Dark Theme Rules
- Never pure black (#000) or pure white (#FFF)
- Background scale: 4 steps for depth (deep → surface → elevated → subtle)
- Accent contrast on bg-deep: 7.8:1 (passes AA for all sizes)
- Use borders for elevation, never shadows (shadows are invisible on dark)

---

## Typography

### Font Stack

| Role | Font | Fallback |
|------|------|----------|
| Primary | Geist Sans | system-ui, -apple-system, sans-serif |
| Mono | Geist Mono | ui-monospace, 'Cascadia Code', monospace |

Both loaded via `next/font` for zero CLS.

### Type Scale

| Level | Font | Weight | Desktop | Mobile | Line Height |
|-------|------|--------|---------|--------|-------------|
| Display | Geist Sans | 600 | 56px | 32px | 1.1 |
| Heading | Geist Sans | 600 | 36px | 24px | 1.2 |
| Subhead | Geist Sans | 400 | 20px | 17px | 1.5 |
| Body | Geist Sans | 400 | 16px | 15px | 1.6 |
| Code | Geist Mono | 400 | 14px | 13px | 1.7 |
| Label | Geist Sans | 500 | 12px | 11px | 1.4 |

Label: uppercase, letter-spacing 0.05em.

### Responsive Breakpoints for Type
- Desktop: ≥1024px (full scale)
- Tablet: 768-1023px (Display 44px, Heading 30px)
- Mobile: <768px (reduced scale above)
- Body never below 14px on any breakpoint

---

## Spacing System

```
Base unit: 4px
Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128

Section padding (vertical):
  Desktop: 96px top/bottom
  Tablet:  64px top/bottom
  Mobile:  48px top/bottom

Component internal padding:
  Desktop: 24px
  Mobile:  16px

Content max-width: 1200px
Narrow content:    720px (text-heavy sections)
```

---

## Component Primitives

### Border Radius

```css
--radius-sm:   6px;      /* Buttons, inputs, small cards */
--radius-md:   12px;     /* Cards, panels */
--radius-lg:   16px;     /* Hero elements, feature cards */
--radius-code: 8px;      /* Code blocks — slightly sharper, more technical */
```

### Borders

```css
--border-subtle: 1px solid rgba(255, 255, 255, 0.06);   /* Default card/panel border */
--border-active: 1px solid rgba(232, 168, 32, 0.3);     /* Active/selected state */
```

### Shadows

None. Dark mode uses borders for elevation, not shadows. Shadows are invisible on dark backgrounds.

### Transitions

```css
--transition-fast:   150ms ease;    /* Hover, focus — micro-interactions */
--transition-normal: 250ms ease;    /* Color changes, opacity */
--transition-slow:   400ms ease;    /* Scroll reveals, entry animations */
```

---

## Button Styles

### Primary (Amber CTA)

```css
background: var(--accent);
color: #080d1a;                      /* Dark text on amber */
border-radius: var(--radius-sm);
padding: 12px 24px;
font-weight: 500;
font-size: 15px;
transition: var(--transition-fast);

&:hover {
  background: var(--accent-hover);
}
&:active {
  transform: scale(0.98);
}
&:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Ghost (Secondary)

```css
background: transparent;
color: var(--text-primary);
border: var(--border-subtle);
border-radius: var(--radius-sm);
padding: 12px 24px;

&:hover {
  background: var(--bg-elevated);
}
```

### Text Link

```css
color: var(--accent);
text-decoration: none;

&:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}
```

---

## Motion Philosophy

### What Animates

| Element | Animation | Trigger |
|---------|-----------|---------|
| Sections | Fade-up (translateY 20px→0, opacity 0→1) | Scroll into view |
| Score number | Count-up (0→82) | Hero enters view |
| Signal checkmarks | Sequential reveal | Stagger after score |
| `.vigil.yml` code | Typewriter effect (optional) | Scroll into view |

### What Does NOT Animate

- Navigation — instant, no transitions
- Text content — appears immediately, no fade
- Buttons — only color transition, no position change
- Page transitions — none, single page

### Timing

```
Micro:    150ms  (hover, focus)
Reveals:  400ms  (scroll-triggered sections)
Stagger:  100ms  (between sequential items like signals)
Easing:   cubic-bezier(0.16, 1, 0.3, 1)  — fast start, gentle landing
```

### Reduced Motion

`prefers-reduced-motion: reduce` — ALL animations instant or removed:
- Score shows final number directly (no count-up)
- Sections appear without fade (no translateY)
- No stagger between signals
- Only color transitions remain (hover states)

---

## Tailwind v4 Integration

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Background */
  --color-bg-deep: #080d1a;
  --color-bg-surface: #0f1729;
  --color-bg-elevated: #1a2744;
  --color-bg-subtle: #1e2d4a;

  /* Text */
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  /* Accent */
  --color-accent: #e8a820;
  --color-accent-hover: #f0b429;

  /* Semantic */
  --color-success: #22c55e;
  --color-failure: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  /* Code */
  --color-code-bg: #060a14;
  --color-code-text: #c4cee0;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-code: 8px;

  /* Fonts */
  --font-sans: 'Geist Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, 'Cascadia Code', monospace;
}
```

Usage: `bg-bg-deep`, `text-accent`, `rounded-code`, `font-mono`, etc.

---

## Asset Convention

Brand assets at `public/brand/` (copied from `.claude/identity/`):
- `logo.svg`, `logo-dark.svg` — navbar/footer
- `icon.svg` — favicon, hero accent
- `wordmark.svg` — hero if applicable
- `favicon.svg` — browser tab

Import as `<Image src="/brand/logo-dark.svg" />` or inline SVG for theme control.
