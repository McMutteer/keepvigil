# Vigil — Landing Page Conversation

**Date:** 2026-03-17
**Status:** Approved

## Mission
Convert developers who use AI coding agents into GitHub App installations. This is a launch landing — the product is feature-complete, deployed, and tested on real PRs. The page must educate, build trust, and drive installs.

## Primary Action
**"Install on GitHub"** — button leading to GitHub Marketplace listing or direct GitHub App installation.

## Required Functionality
- [x] Hero with visual demo — show a real Vigil PR comment (score, signals, recommendation)
- [x] Install CTA — button to GitHub Marketplace / App install
- [x] Signals breakdown — the 7 signals explained visually
- [x] Pricing table — Free / Pro $19 / Team $49
- [x] `.vigil.yml` config preview — show how simple configuration is
- [x] Navbar — logo + minimal links
- [x] Footer — GitHub repo, docs, minimal legal

## Experience Direction
The visitor should feel:
1. **Recognition** — "Yes, I merge agent PRs without verifying"
2. **Intrigue** — "A confidence score? That doesn't exist"
3. **Evidence** — "Look, this is what Vigil produces on a real PR"
4. **Confidence** — "It's free to start, zero config, zero friction"
5. **Action** — "I'm installing it now"

Vibe: dark mode default, technical (monospace for code, terminal aesthetic), silent (generous whitespace), precise (concrete data, not marketing speak), amber accent (the vigil candle).

## Boundaries (What We Won't Do)
- No testimonials (no public users yet)
- No video (the product is silent, a video adds no value)
- No chat widget / popups / newsletter signup
- No blog / changelog
- No dashboard screenshots (no dashboard exists)
- No direct competitor comparison table
- No excessive animations — personality is silent and precise

## Technical Constraints
- Next.js 15 (App Router) — SSG for performance
- Tailwind CSS 4
- Geist Sans + Geist Mono
- Dark mode default (and only — no light mode toggle needed)
- Must load fast — target Lighthouse 95+
- Brand assets at `public/brand/` from `.claude/identity/`

## Appetite
Polished launch landing. Not a "coming soon" page — the public presence of a working product. Not a 15-section site either. 5-7 well-crafted sections that tell the story efficiently.

## User References
No specific site references provided. Design derived entirely from product identity (The Sentinel, nocturnal, precise, silent).
