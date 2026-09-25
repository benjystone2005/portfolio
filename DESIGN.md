# Design

## Overview

Light, readable system inspired by Wispr Flow: a near-white canvas faintly tinted toward the brand green, deep-green rounded panels bookending each page (home hero, closing contact panel), and soft sage / lilac feature panels for the proof points. EB Garamond headlines over Figtree body copy. Built for a recruiter skimming in daylight: every page states who, what and where in the first screen, and interior pages carry an "On this page" jump row. Static four-page site (Home, Experience, Projects, Beyond Finance), no build step, no JS dependencies.

## Colors

All tokens live in `:root` in `css/style.css`, written in OKLCH.

| Token | Role |
|---|---|
| `--bg` | Page canvas (off-white, chroma toward the brand green) |
| `--surface` | Sage panel: LWX feature, tags, jump pills |
| `--surface-lilac` | Lilac panel: IAG feature, World Cup panel. Never text |
| `--ink` / `--ink-2` | Primary / secondary text (both AA+ on every light surface) |
| `--line` / `--line-strong` | Hairline dividers |
| `--brand` | Deep green: hero + contact panels, stat numerals, role lines, active nav underline |
| `--on-brand` / `--on-brand-2` | Primary / secondary text on green panels |

Rule: green is the committed brand colour; lilac is a surface tint only. No third hue.

## Typography

- Display: EB Garamond 400, `letter-spacing: -0.015em` to `-0.02em`, `text-wrap: balance`. Headings, stat numerals, wordmark, nav-strip names.
- Body: Figtree 400/500/600, 18px base, line-height 1.6, prose capped at 68ch.
- Sentence case throughout. No uppercase tracked eyebrows; section meta lines are plain 15px `--ink-2`.

## Layout

- Content max-width 1200px, gutter `clamp(16px, 4vw, 40px)`.
- Brand panels inset from the viewport by `--edge` (8–16px) with a 24px radius; feature panels 20px; cards/images 12px; buttons and tags are pills.
- Hero and research/LWX blocks are two-column, collapsing to one column at 960px. Nav collapses to a menu toggle at 768px.

## Components

- **Nav:** sticky, solid canvas, hairline appears on scroll. Ink pill "Connect on LinkedIn".
- **Buttons:** `.btn--ink` (primary on light), `.btn--light` (primary on green), `.btn--outline`, `.btn--ghost-light`. Text links use `.link`.
- **Glance list (home hero):** label/value rows, the fastest scan of the candidate.
- **Feature panel:** text + real imagery (live LWX screenshot, memo page 1).
- **Entry:** date/place column + org (serif), role (green), bulleted points. Used on Experience and Beyond Finance.
- **Contact panel:** closes every page with a page-specific line, two actions and copyable details.

## Finance / accounting details (home)

- **Auditor's ticks:** each glance fact is checked off in sequence after load.
- **Figures tape:** a slow crawl of real figures from the work (never invented data); pauses on hover/focus, scrolling nudges it faster, static and scrollable under reduced motion.
- **LWX chart:** built by `js/main.js` from the `data-series` attribute on the figure. Add `["YYYY-MM-DD", value]` pairs to update it; axis, range label and end value follow. Hover or arrow keys read out each observation.
- **Double rule under totals:** headline stats carry the accounting grand-total double underline, ruled in once the figure lands.

## Motion

- Home load: name rises out of its line, glance rows settle, ticks draw. Interior pages: title fades up.
- Home scroll: hero recedes (scale + content drift); section titles and ledger rules are ruled in left to right; the LWX line is plotted with the headline figure reading the index at the pen's position; the memo page drifts with a gentle parallax.
- Scroll reveals are armed by JS only when IntersectionObserver exists and motion is allowed; content is visible by default.
- Stat numerals count up once. LWX clock keeps live time. Plane flyover once per visit.
- Everything collapses under `prefers-reduced-motion`.

## Don'ts

- Don't add a third colour or use lilac for text.
- Don't gate content visibility on an animation.
- Don't reintroduce moving marquees or scroll-scrubbed 3D; they cost readability.
- Don't touch the underlying copy/facts on any page; this file governs the visual system only.
