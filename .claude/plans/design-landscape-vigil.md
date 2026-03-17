# Vigil — Competitive Landscape Research (Phase 2)

**Date:** 2026-03-17
**Status:** Complete
**Source:** Analysis from knowledge of these products' landing pages

---

## Category 1: Direct Competitors (PR/Code Verification Tools)

### CodeRabbit (coderabbit.ai)
- **Palette:** Dark mode default. Deep purple/indigo background, green accent, white text
- **Typography:** Sans-serif (Inter), clean weights. Monospace for code examples
- **Hero:** Text + animated product screenshot. "AI-first code reviews"
- **Section order:** Hero → social proof logos → features grid → how it works → integrations → pricing → CTA
- **CTA:** "Start for Free" — green button, repeated 3+ times
- **Social proof:** Company logos (prominent), GitHub stars, "trusted by X developers"
- **What works:** Shows actual PR comments inline. Makes the product tangible immediately.
- **What doesn't:** Very busy. Lots of gradients, animations competing for attention. Feels like every other AI SaaS.

### Codecov (about.codecov.io)
- **Palette:** Light mode default. White background, purple/magenta accent
- **Typography:** Clean sans-serif, standard SaaS typography
- **Hero:** Text-heavy with illustration. "Ship healthier code faster"
- **Section order:** Hero → logos → features → how it works → integrations → pricing
- **CTA:** "Sign Up" — standard purple button
- **Social proof:** Heavy — customer logos, stats ("used by 29,000+ orgs")
- **What works:** Clear value prop. Coverage data is visual (charts, badges).
- **What doesn't:** Feels corporate. Generic SaaS template energy. Nothing memorable.

### Snyk (snyk.io)
- **Palette:** Light mode. White/light gray. Purple as primary brand color.
- **Typography:** Custom sans-serif, bold headlines
- **Hero:** Large text + abstract illustration. Enterprise-focused copy.
- **Section order:** Hero → enterprise logos → products → use cases → resources → pricing
- **CTA:** "Sign up for free" / "Request a demo" — dual CTA (PLG + enterprise)
- **Social proof:** Massive logo wall. Customer quotes. Stats.
- **What works:** Clear product categorization (Code, Container, IaC, Cloud).
- **What doesn't:** Very enterprise, very corporate. Not developer-first. Too many CTAs competing.

### GitGuardian (gitguardian.com)
- **Palette:** Dark blue/navy primary. Yellow/gold accent. Dark mode tendency.
- **Typography:** Clean sans, bold for emphasis
- **Hero:** "Secure your software development lifecycle" + product screenshot
- **Section order:** Hero → logos → features → how it works → integrations → testimonials → pricing
- **CTA:** "Get Started Free" — gold/yellow button
- **Social proof:** Logos, stats ("12M+ developers"), testimonials
- **What works:** Good balance of dark aesthetic with warm yellow accent. Shows actual detection results.
- **What doesn't:** Still very enterprise-marketing. Copy is buzzwordy.
- **NOTABLE:** Similar color scheme to Vigil (dark + amber/gold). We need to differentiate through being MORE technical, less marketing.

---

## Category 2: Aspirational Developer Tools (The Vibe We Want)

### Linear (linear.app)
- **Palette:** Pure dark. Near-black background (#0A0A0A range). Purple accent. Minimal color use.
- **Typography:** Custom sans-serif (clean, tight tracking). Very deliberate sizing hierarchy.
- **Hero:** Text + product screenshot. "Linear is a purpose-built tool for planning and building products"
- **Section order:** Hero → features (large, spaced) → product screenshots → speed/quality highlights → CTA
- **Whitespace:** EXTRAORDINARY. Sections have massive padding. Content breathes. Never feels crowded.
- **Dark mode:** Default and only. No toggle. The product IS dark.
- **Motion:** Subtle parallax on screenshots. Smooth scroll reveals. Never distracting.
- **What creates the feeling:** The RESTRAINT. What they DON'T show is as powerful as what they show. No logo walls, no testimonial carousels, no "trusted by" banners. The product speaks for itself.
- **Borrow:** Whitespace discipline. Typography hierarchy. Confidence to NOT over-explain.

### Resend (resend.com)
- **Palette:** Dark mode. Near-black background. White text. Accent changes per section (multicolor approach).
- **Typography:** Custom sans + monospace. Code blocks are design pieces, not afterthoughts.
- **Hero:** Large text + code snippet. Shows the API call immediately. "Email for developers"
- **Section order:** Hero (with code) → features → code examples → integrations → pricing → CTA
- **Dark mode:** Default. Code blocks are prominent and beautifully styled.
- **Motion:** Minimal. Subtle fades. No gratuitous animation.
- **What creates the feeling:** Code AS hero. The product is an API — so the hero IS a code block. Zero pretense. "Here's how you send an email. 3 lines."
- **Borrow:** Code blocks as first-class design elements. Immediate product evidence in the hero.

### Vercel (vercel.com)
- **Palette:** Dark mode default. Pure blacks. White text. Slight blue tint on some elements.
- **Typography:** Geist (their own font). Clean, tight, purposeful.
- **Hero:** Animated/interactive product demo. Shows deployment happening live. "Your complete platform for the web"
- **Section order:** Hero (interactive) → features with demos → speed metrics → integrations → CTA
- **Dark mode:** Default. Matches their developer audience (coding in dark editors).
- **Motion:** The most animated of the group. But every animation demonstrates the product — nothing is decorative.
- **What creates the feeling:** The hero IS the product. You see a deployment happen. Visual continuity: dark site → dark terminal → dark Vercel dashboard. It all feels like one environment.
- **Borrow:** Hero as live product demo concept. Geist font (already planned). Speed/performance as design value.

### Raycast (raycast.com)
- **Palette:** Dark mode. Very dark backgrounds. Purple/violet accent. Colorful icons.
- **Typography:** Clean sans-serif. Tight. Good hierarchy.
- **Hero:** Product screenshot with slight 3D perspective. "Your shortcut to everything"
- **Section order:** Hero → extensions gallery → features → community → download
- **Dark mode:** Native. The product is a Mac app — dark mode matches the UX.
- **What creates the feeling:** Speed. Everything about the page suggests instant response. Short copy, sharp transitions, compact sections.
- **Borrow:** Concise copy approach. No section overstays its welcome.

---

## Category 3: GitHub App / Marketplace Landings

### Renovate (mend.io/renovate)
- **Hero:** "Automated Dependency Updates" + install button
- **Install flow:** Direct "Install on GitHub" button, very prominent
- **Trust signals:** GitHub stars badge, "used by X repos"
- **Product output:** Shows the actual PR that Renovate creates (screenshot of GitHub PR)
- **Key insight:** Shows real GitHub UI — the PR title, the description, the merge button. Makes it tangible.

### Dependabot (built into GitHub)
- **Trust signals:** Native to GitHub — ultimate trust
- **Product output:** Shows the security alert → PR flow
- **Key insight:** Minimal page. The product is so integrated it barely needs a landing.

### GitGuardian (as GitHub App)
- **Install flow:** "Start for Free" → GitHub OAuth flow
- **Product output:** Shows the PR comment with detected secrets
- **Trust signals:** GitHub Marketplace badge, install count
- **Key insight:** The PR comment IS the product screenshot. That's what sells.

---

## Synthesis

### Common Patterns (what works)

1. **Dark mode is the norm** for developer tools. Linear, Vercel, Resend, Raycast, GitGuardian — all dark by default. This is expected, not novel.

2. **The hero shows the product, not an illustration.** The best dev tool landings put the actual product output front and center. Resend shows code. Vercel shows deployment. CodeRabbit shows PR comments.

3. **Social proof is calibrated to stage.** Pre-launch: GitHub stars, open-source badge. Growth: logo walls, stats. Vigil should lean on open-source + real output.

4. **Code blocks are design elements.** In the best dev tool landings, code isn't just documentation — it's visual design. The `.vigil.yml` config block should be beautiful.

5. **Restraint wins.** Linear's success is about what they DON'T include. Snyk/Codecov suffer from including everything.

### What Vigil Should Borrow

| From | What | Why |
|------|------|-----|
| **Linear** | Whitespace discipline, typography-first hierarchy | Vigil is silent — the page should feel silent too |
| **Resend** | Code blocks as hero-level design | The `.vigil.yml` config and PR comment ARE the product |
| **Vercel** | Hero as product demo (the score box animated) | The confidence score IS the hook — show it working |
| **GitGuardian** | Dark + amber/gold palette with product screenshots | Closest aesthetic match, but Vigil should be MORE restrained |
| **Renovate** | Showing actual GitHub PR output | The Vigil PR comment is the product — screenshot it |

### What Vigil Should Explicitly Avoid

| Pattern | Why avoid |
|---------|-----------|
| Logo walls ("trusted by...") | No customers yet. Fake social proof destroys trust |
| Gradient backgrounds (CodeRabbit) | Decorative. Vigil's personality is precise, not flashy |
| Enterprise copy ("accelerate your SDLC") | Vigil speaks to individual developers, not procurement |
| Feature comparison tables | Positioning as "not competitors" — different category |
| Multiple CTA types (sign up + request demo) | One action: install on GitHub |
| Animated illustrations | Evidence > illustration. Real output > conceptual art |

### Vigil's Unique Opportunity

No competitor does ALL of this:
1. **Dark-only** as a deliberate brand choice (not just dark mode support)
2. **The score as visual hook** — 0-100 is immediately graspable, visually distinctive
3. **Evidence-first** — actual PR comment output, not screenshots of a dashboard
4. **Minimal** — fewer sections than any competitor, each earning its place
5. **Amber as sole warm color** — distinctive palette (most use blue/purple/green)

### Recommended Section Order

Based on what converts in this category:

```
Navbar (logo + GitHub link + Install CTA)
Hero — Score demo (the number IS the hook)
Problem — "You merge AI PRs without verifying" (make the pain real)
How It Works — 7 signals, visually clear
Evidence — Real PR comment (the product IS a comment)
Config — .vigil.yml simplicity (3 lines to start)
Pricing — Free / Pro / Team
Footer CTA — Final install button + GitHub + MIT license
```
