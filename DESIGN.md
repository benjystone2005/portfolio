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

- **Nav:** sticky, solid canvas, hairline appears on scroll and a green reading line fills along it as you go down the page. Ink pill "Connect on LinkedIn".
- **Pixel name (home hero):** the name is redrawn on a canvas as a grid of square pixels in `--on-brand`, rastered letter by letter from where the browser set the real heading, so it follows the type exactly. The heading keeps its text (transparent) for screen readers, search and copying; forced-colours mode shows the text instead. Static under reduced motion; the plain heading if the canvas can't take over.
- **Buttons:** `.btn--ink` (primary on light), `.btn--light` (primary on green), `.btn--outline`, `.btn--ghost-light`. Text links use `.link`.
- **Glance list (home hero):** label/value rows, the fastest scan of the candidate.
- **Feature panel:** text + real imagery (live LWX screenshot, memo page 1).
- **Checklist board (home projects):** the two feature panels sit on a white sheet clipped to a green board. A ruled margin holds a numbered box per project; a tally and meter in the sheet's header count them off.
- **Entry:** date/place column + org (serif), role (green), bulleted points. Used on Experience and Beyond Finance.
- **Contact panel:** closes every page with a page-specific line, two actions and copyable details.
- **Index list (home "More about me"):** hovering a row rules in a sage highlight left to right; it fades on the way out.

## Finance / accounting details (home)

- **Chart intro:** on arrival or reload (not when clicking Home from another page, not on Back, not with a URL anchor, never under reduced motion) the home page opens on an LWX quote: the line draws itself (1.5s), the price and change read the index at the pen, and a last-price tag rides the right axis. It holds on the last print for one ping, then plays on its own: the camera flies into that dot, which is the hero seen through a `clip-path` circle, growing until the screen is green and settling into the rounded hero panel (1.9s). About 4s in all; the page holds still meanwhile. Any scroll, key or tap plays the rest at 4x; tabbing into the hero skips it. When it ends the stage is removed and the page is the plain home page. Reads the same `data-series` as the LWX chart.
- **Checklist ticks:** each project's box fills and its tick is drawn as the project scrolls past the lower third of the screen; the tally and meter catch up once the tick lands. Ticked in the HTML, so without motion the board reads as done.
- **Auditor's ticks:** each glance fact is checked off in sequence after load.
- **Figures tape:** a slow crawl of real figures from the work (never invented data); pauses on hover/focus, scrolling nudges it faster, static and scrollable under reduced motion.
- **LWX chart:** built by `js/main.js` from the `data-series` attribute on the figure. Add `["YYYY-MM-DD", value]` pairs to update it; axis, range label and end value follow. Hover or arrow keys read out each observation.
- **Double rule under totals:** headline stats carry the accounting grand-total double underline, ruled in once the figure lands.

## Motion

- Home load: the chart intro draws and flies into its last dot; once the dot opens onto the hero, the name's pixels gather into it left to right, like scattered data points settling into one figure; glance rows settle, ticks draw (straight away when the intro is skipped). Interior pages: title fades up.
- Pixel name: pixels near the pointer are pushed aside, lift slightly and bob while it's near, then spring back (a just-under-damped spring, so they settle with a small wobble). A finger does the same while it's down. The loop sleeps whenever nothing is moving.
- Home scroll: hero recedes (scale + content drift) and the name's pixels drift apart; section titles and ledger rules are ruled in left to right; the LWX line is plotted with the headline figure reading the index at the pen's position; the memo page drifts with a gentle parallax.
- Every page: the contact panel grows into place as you reach it (scale 0.95 to 1, content drift), the mirror of the hero receding, and its line is ruled in. Moving between pages, the nav holds still while the page under it crossfades up (cross-document view transitions; a plain page load where unsupported).
- Interior scroll: group titles are ruled in like the home section titles; each entry's top rule is drawn, then its date, heading and points follow in a short stagger; headline figures on Projects are ruled in one by one; skill and interest tags come in one after another. Entrances fade up out of a slight blur. The Projects memo page has the home page's parallax. The cricket ball's seam rolls with the page and coasts to a stop; the light on it stays put.
- Scroll reveals are armed by JS only when IntersectionObserver exists and motion is allowed; content is visible by default.
- Stat numerals count up once. LWX clock keeps live time. Plane flyover once per visit.
- Everything collapses under `prefers-reduced-motion`.

## Don'ts

- Don't add a third colour or use lilac for text.
- Don't gate content visibility on an animation.
- Don't reintroduce moving marquees or scroll-scrubbed 3D; they cost readability.
- Don't touch the underlying copy/facts on any page; this file governs the visual system only.
