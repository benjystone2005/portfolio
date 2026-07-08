# Design

## Overview

Mercury system: alpine banking at blue hour. A near-black onyx canvas with one-step-lighter graphite surfaces, monochromatic ivory/ash type, and a single cobalt accent reserved for the primary action and for the hero's light source. Flat, borderless, no drop shadows; separation comes from value contrast alone. Pill-shaped controls, 12px card radius. Static four-page site (Home, Experience, Projects, Beyond Finance), no build step, GSAP + Three.js/Canvas via CDN.

## Colors

| Token | Value | Role |
|---|---|---|
| `--color-onyx` | `#171721` | Page canvas, hero/section background |
| `--color-graphite` | `#1e1e2a` | Card and elevated-surface fill (no border, no shadow) |
| `--color-graphite-hover` | `#24242f` | Card hover state |
| `--color-obsidian` | `#272735` | Secondary structural surface (grid lines, dividers' dark side) |
| `--color-slate` | `#70707d` | Structural dividers, muted decorative strokes |
| `--color-ash` | `#c3c3cc` | Secondary text (body copy, labels, meta) |
| `--color-ivory` | `#ededf3` | Primary text and foreground |
| `--color-cobalt` | `#5266eb` | The one chromatic accent: primary CTA fill, hover states, and the hero scene's sole light source |
| `--color-white` | `#ffffff` | Text on cobalt fills only |

Rule: cobalt appears in exactly two places on any given page - the nav's filled CTA pill, and (on the home hero) the WebGL scene's horizon light. It is never used as decoration, a second button, or a WebGL/particle color.

## Typography

Current: Inter for both display and body (Mercury's stated CDN-friendly substitute for Söhne Breit + Inter). Under review this pass: Inter-everywhere reads as a default rather than a choice. Direction: keep Inter for body/UI (explicitly permitted as a neutral, Linear-adjacent choice), introduce a distinct display face for headlines only - a variable-width grotesk so the "wide, architectural" character Mercury's spec asks for is a real typographic property, not a description.

- Display weight: 480 only. Never bolder.
- Body weight: 400, line-height 1.5.
- Letter-spacing: positive on display (0.01-0.02em), calm on body.
- Case: sentence case throughout. No uppercase body/nav/button text.

## Layout

- Page content max-width 1200-1400px depending on section.
- 72px vertical rhythm between major sections.
- Left-aligned hero content (never centered), asymmetric where the design read calls for it.
- Mobile collapses every multi-column layout to single column at 768px.

## Elevation & Depth

No shadows anywhere in the system. Elevation is value contrast only: graphite (#1e1e2a) sits one step lighter than onyx (#171721). Depth in the hero and scroll choreography comes from real 3D (WebGL/CSS perspective transforms + camera movement), not from box-shadow.

## Shapes

- Cards: 12px radius, flat fill, no border.
- Buttons/inputs: pill (32px primary, 40px ghost/outline).
- One radius system for the whole site; no mixing sharp and soft without a documented reason.

## Components

- **Primary CTA (cobalt pill):** one per page, the nav's persistent "Connect on LinkedIn."
- **Ghost button (ivory outline pill):** secondary actions (Download CV, Email).
- **Graphite card:** flat, no border, no shadow, hover = slight background lift + translateY, no glow.
- **Nav:** transparent over hero, frosted (backdrop-blur) on scroll.
- **Live clock pill (Projects, LWX section):** monospace tabular time, cobalt dot as the only accent detail, blinking colon. Content-motivated (watches to time), not decorative.

## Do's and Don'ts

### Do
- Reserve cobalt for the single CTA and the hero light source, nothing else.
- Keep every card borderless and flat; separation via value contrast only.
- Animate with a stated reason (hierarchy, state, narrative); if the reason can't be said in one sentence, cut the animation.
- Respect `prefers-reduced-motion` everywhere motion appears.

### Don't
- Don't add a second accent color, however desaturated.
- Don't default to three equal cards in a row for proof points or features.
- Don't add eyebrow/kicker labels to more than one section in three.
- Don't add scroll cues, vertical rotated page-counters, or agency-portfolio decoration strips.
- Don't touch the underlying copy/facts on any page; this file governs visual system only.
