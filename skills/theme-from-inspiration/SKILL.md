---
name: theme-from-inspiration
description: Develop or revise a brand theme — palette, typography, shape, motion and the written DESIGN.md brief — from inspiration such as website links, screenshots, moodboard images, brand assets or a verbal description, and encode it as design tokens (design/tokens.json) for a React/Next.js project. Use when the user shares reference links/images, asks for a brand palette, a theme, a design system foundation, a rebrand, or "make it look like X".
---

# theme-from-inspiration

Output: `design/tokens.json` + a filled-in `design/DESIGN.md` + `design/inspiration/brief.md`, all passing
`npm run design:check`. The theme is *derived* from references, never copied.

Prerequisite: `design/design.config.json` exists (else run **foundry-setup** first).

## 1. Gather

For each reference:

| Input | Do |
| --- | --- |
| Website URL | `npm run design:inspect -- <url>` → screenshots + computed palette/type/radii/spacing + their `:root` tokens in `design/inspiration/<slug>/summary.md`. If it fails (no browser/network), use your browser tool or WebFetch and record observations by hand. |
| Image file | `npm run design:inspect -- <path>` → dominant palette. Also **look at the image** (Read it) — k-means finds colors, not mood. |
| Pasted screenshot | Look at it; describe palette, type, density, shape in notes. |
| Words only | Skip to step 2 and ask one question if the brief is genuinely ambiguous. |

Always view the generated screenshots yourself. Numbers tell you *what*, the image tells you *why it works*.

## 2. Write the brief (`design/inspiration/brief.md`)

Before touching tokens, decide in prose:

- **Personality** — 3–5 adjectives, plus anti-adjectives ("never playful, never corporate-blue").
- **Take / Leave per source** — specific transferable qualities ("warm off-white canvas", "single saturated accent
  used sparingly", "tight display tracking") vs. what belongs to their brand (exact hex, logo, illustration).
- **Tensions** — where sources disagree and which wins for *this* product.
- **Density & audience** — dashboard power users ≠ marketing visitors.

Show the brief to the user in 5–8 lines before building tokens if they are present; otherwise proceed and note it.

## 3. Palette → primitives

Read `references/palette-method.md`. Short version:

1. Pick 1 brand hue (maybe 1 secondary), a neutral temperature, and status hues that harmonise.
2. Generate ramps: `npm run design:ramp -- brand="<seed>" neutral="<seed>" red="…" green="…" amber="…" --neutral neutral --write`
   (fixed OKLCH lightness per step, chroma curve, sRGB-gamut-mapped). Hand-tune individual steps if a hue looks off.
3. Neutrals are almost never pure gray: tint them toward the brand hue or a warm/cool temperature (chroma 0.005–0.02).

## 4. Primitives → semantic roles (light + dark)

Edit `semantic.color.*` in `design/tokens.json`. Every role references a primitive and has
`$extensions.mode.dark`. Keep the shadcn-compatible role names (lint requires them); add extra roles only when a real
need exists (e.g. `brand-subtle`, `chart-1..5`). Starting mapping and dark-mode rules are in `references/palette-method.md`.

Then: `npm run design:build && npm run design:contrast` — fix every failing pair by moving the *semantic mapping*
one step along the ramp, not by inventing new colors.

## 5. Typography, shape, motion

Read `references/type-shape-motion.md`. Decide: families (with next/font wiring), scale ratio, weights,
radius personality, shadow vs border elevation, easing/duration feel. Encode in `semantic.font|text|weight|radius|shadow|ease|duration`
and component tokens (`component.control.height-*`).

Font tokens put the next/font variable first, then the family name: `["var(--font-display)", "Fraunces", "serif"]`,
and the font is loaded in `app/layout.tsx` with `variable: '--font-display'` applied on `<html>`.

## 6. Write DESIGN.md

Fill every `<!-- fill -->` in `design/DESIGN.md` from the brief. Rules must be **checkable** ("one primary button per view",
"display face only ≥ text-3xl") rather than adjectives. Update frontmatter (`name`, `updated`, `sources`).
Never edit the `ui-foundry:generated` blocks.

## 7. Prove it

```bash
npm run design:build
npm run design:check        # must pass: no placeholders, contrast AA both modes, docs in sync
```

With the dev server running: `npm run design:verify -- --routes /design-system` and **look at the light and dark
screenshots**. Ask: does this feel like the brief's adjectives? Would someone confuse it with the reference brand
(too close) or with a default template (too generic)? Iterate on tokens, not on components.

## 8. Report

One short paragraph: the direction in a sentence, primary/neutral/typography choices, anything you traded off,
and the specimen screenshot(s). Next step suggestion: **component-build** for missing pieces or **ui-build** for screens.

## Revisions

For "make it warmer / punchier / calmer": change the fewest tokens possible (usually neutral hue/chroma, primary step,
radius, display font), rebuild, re-verify, and update the affected DESIGN.md prose. `docs/stray-color` lint catches prose
that still mentions old values.
