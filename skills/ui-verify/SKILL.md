---
name: ui-verify
description: Verify front-end work against the design system in a real browser — screenshots across mobile/tablet/desktop and light/dark, automated checks (off-palette colors, WCAG contrast, off-scale type, fonts, overflow, tap targets, accessible names, alt text, console errors, axe), then a visual review of the screenshots against DESIGN.md with fix-and-recheck iterations. Use before calling any UI change done, when asked to check/QA/review a page or component visually, or after theme changes.
---

# ui-verify

Automated checks are the floor; your eyes on the screenshots are the bar. A page can pass every check and still be
wrong (unstyled layout, weak hierarchy, cramped spacing) — so always do both.

## 1. Static gate

```bash
npm run design:lint -- --changed      # or --files <paths>; must have 0 errors before rendering
npx tsc --noEmit
```

## 2. Render

The dev server must be running (`npm run dev`, background it if needed; wait until the route returns 200).

```bash
npm run design:verify -- --routes /design-system /changed/route [--viewports 390 768 1440] [--themes light dark]
```

Defaults come from `design.config.json → verify`. Include `/design-system` whenever components or tokens changed.
Output: `design/.verify/<timestamp>/` with `report.md`, `report.json` and `<route>@<width>-<theme>.png`
(path of the latest run in `design/.verify/latest.txt`). Exit code 1 = errors.

Needs Playwright (`npm i -D playwright`); falls back to system Chrome. If no browser is possible here, use your
browser tool (built-in browser / Claude in Chrome / Cursor browser) to load the route at 390 and 1440 wide in both
themes, take screenshots, and run the visual review manually.

Routes needing auth or data: seed a demo state or add a dev-only fixture route; don't verify an error page.
Interactive states (open menus/dialogs, hover) aren't in full-page screenshots — open them with the browser tool.

## 3. Read the report

| Check | Meaning / usual fix |
| --- | --- |
| `off-palette` | A rendered color isn't a token → find the source class/style (selector given); usually a raw value or a third-party style |
| `contrast` | Text fails AA on its actual background → wrong role pairing (e.g. `text-muted-foreground` on `bg-primary`) or token mapping |
| `type-scale` / `font-family` | Size/font not in tokens → arbitrary class, browser default (`<h1>` without classes), or font not wired via next/font |
| `overflow` | Horizontal scroll at that width → fixed widths, long unbroken strings, grids without `min-w-0` |
| `tap-target` | < 24px interactive elements on mobile → use component sizes, add padding |
| `accessible-name`, `img-alt` | Add `aria-label` / visible text / `alt` |
| `console`, `http`, `load` | Fix runtime errors first — they invalidate everything else |
| `axe/*` | Only when `@axe-core/playwright` is installed; follow the rule's help text |

## 4. Look at the screenshots

Open (Read) at least: mobile + desktop for each changed route, in light **and** dark. Score them with
`references/visual-review-rubric.md` — hierarchy, alignment & rhythm, density, color discipline, typography,
states, responsiveness, brand fit vs DESIGN.md's Do/Don't. Write down concrete defects ("card titles and body are
both text-sm — no hierarchy"), not impressions.

## 5. Fix → re-verify (max 3 rounds)

Fix at the right layer: token problem → tokens.json; component problem → component (component-build skill);
composition problem → the page. Re-run lint + verify for the affected routes only. Stop after 3 rounds and report
what remains with screenshots.

## 6. Report

- Pass/fail summary (errors/warnings before → after) and the report path.
- 1–2 key screenshots (send via the file tool) — mobile + desktop of the main route.
- Remaining issues with severity and suggested fix. Never claim "verified" without having looked at screenshots.
