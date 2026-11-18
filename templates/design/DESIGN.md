---
name: <!-- fill: product name -->
version: 0.1.0
updated: <!-- fill: YYYY-MM-DD -->
sources: []
tokens_hash: pending
---

# DESIGN.md

The design system brief for humans **and** coding agents. Values live in `design/tokens.json`; the
tables marked *generated* below are rewritten by `npm run design:build` — never edit them by hand.
Everything else is judgment: write it so an agent that has never seen the product would make the
same call you would.

> **Agents:** read this file and `design/components.md` before writing UI. Use only semantic tokens
> and library components. If something you need does not exist, add it to tokens / the library
> first (skills: `theme-from-inspiration`, `component-build`) — never inline a one-off.

## 1. Brand essence

- **Personality (3–5 adjectives):** <!-- fill: e.g. calm, precise, quietly confident -->
- **Feels like:** <!-- fill: references that capture the mood, e.g. "a well-made field notebook" -->
- **Never feels like:** <!-- fill: anti-references, e.g. "crypto dashboard", "playful SaaS" -->
- **Audience & context:** <!-- fill: who uses it, where, how often, on what device -->
- **Density:** <!-- fill: compact | comfortable | spacious — and why -->

## 2. Color

<!-- fill: 2–4 sentences on the palette's intent. Which color carries the brand? How loud is it allowed to be? -->

Rules:
- Primary is for the single most important action per view. <!-- fill: refine -->
- Status colors (destructive/success/warning) only communicate state — never decoration.
- Text on any filled surface uses that surface's `-foreground` partner.

*Generated:*
<!-- ui-foundry:generated:colors -->
<!-- /ui-foundry:generated:colors -->

## 3. Typography

<!-- fill: the voice of the type. Why these families? Where does the display face appear, and where is it banned? -->

Rules:
- One `text-*` step per role; don't invent in-between sizes.
- Headlines use tight tracking (built into the large steps); body copy never does.
- Numbers in tables use `font-mono` or `tabular-nums`. <!-- fill: refine -->

*Generated:*
<!-- ui-foundry:generated:typography -->
<!-- /ui-foundry:generated:typography -->

## 4. Layout & spacing

- **Grid:** <!-- fill: e.g. 12 columns, 24px gutters on desktop; single column under md -->
- **Content width:** `max-w-content` for app pages, `max-w-prose` for reading.
- **Rhythm:** <!-- fill: e.g. sections separated by 16–24 steps; related controls by 2–3 -->
- **Breakpoints:** mobile-first; design at 390, check 768 and 1440.

## 5. Shape & elevation

<!-- fill: corner personality (sharp/soft), when shadows appear vs borders, how surfaces stack. -->

*Generated:*
<!-- ui-foundry:generated:shape -->
<!-- /ui-foundry:generated:shape -->

## 6. Motion

<!-- fill: how things move. e.g. "Quick and functional; nothing bounces. Respect prefers-reduced-motion." -->

*Generated:*
<!-- ui-foundry:generated:motion -->
<!-- /ui-foundry:generated:motion -->

## 7. Components

The library lives in `components/ui` and is catalogued in [`components.md`](./components.md).
Feature code composes library components; it never restyles them with ad-hoc classes.

- Need a variant that doesn't exist? Add it to the component (component-build skill).
- Need a new pattern used ≥2 times? Promote it to the library.

## 8. Voice & content

- <!-- fill: tone, e.g. "Plain, direct, second person. No exclamation marks." -->
- Buttons are verbs ("Save changes", not "OK").
- Empty states explain what will appear and offer the next action.
- Use realistic sample content in UI work — no lorem ipsum.

## 9. Do / Don't

| Do | Don't |
| --- | --- |
| <!-- fill: concrete, checkable rule --> | <!-- fill: the specific failure it prevents --> |
| Use `bg-primary` for one key action per view | Put two primary buttons side by side |
| Use `muted` surfaces to group related content | Nest cards inside cards |
| Use semantic tokens everywhere | Write hex values, `bg-blue-500`, `text-[13px]`, or `dark:` color overrides |

## 10. Accessibility

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI boundaries) in **both** themes — enforced by `npm run design:contrast`.
- Every interactive element has a visible focus state using `ring` and an accessible name.
- Tap targets ≥ 24×24px (aim for 44 on touch-first screens).
- Motion respects `prefers-reduced-motion`.
