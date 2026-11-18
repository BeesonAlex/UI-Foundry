---
name: ui-build
description: Build pages, screens, flows and layouts in a React/Next.js app strictly from the project's component library and design tokens, following DESIGN.md — plan the composition, fill gaps through the library (not inline), handle responsive/empty/loading/error states, then verify visually. Use for any request to build or redesign a page, screen, dashboard, form, landing page, settings view, or to "make the UI", "implement this mockup/screenshot/Figma frame", or improve how an existing screen looks.
---

# ui-build

Screens are **assembled, not invented**: library components + semantic tokens + layout. When something is missing,
fix the system first, then use it.

## 1. Load the system (always)

Read `design/DESIGN.md` (especially Brand, Layout, Do/Don't, Voice) and `design/components.md`. Skim
`components/ui/index.ts` for exports. If `design/` doesn't exist → **foundry-setup**; if DESIGN.md is still mostly
placeholders → suggest **theme-from-inspiration** first (or proceed with the starter theme if the user wants speed).

If given a mockup / screenshot / Figma frame: treat it as layout + content intent. Map its colors and type to the
nearest *roles* and *steps*; don't copy its pixel values. (Figma: use the Figma MCP's design-context tools if connected.)

## 2. Plan the composition (write it before coding)

A short plan, in the reply or a scratch note:

```
Route: /settings/billing  (server component; client islands: PlanDialog)
Goal: user can see plan + usage and upgrade
Layout: PageHeader → 2-col (lg) / stacked (base): [PlanCard, UsageCard] → InvoicesTable
Components: PageHeader(new?), Card, Button(primary: "Upgrade plan" ×1), Badge, Table(new), Dialog
States: no invoices (EmptyState), loading (skeleton rows), payment failed (destructive callout)
Missing from library: PageHeader, Table, EmptyState → build via component-build first
```

Rules: one primary action per view; group by proximity; pick widths from `max-w-content` / `max-w-prose`; mobile-first.
Patterns for common screens are in `references/composition-patterns.md`.

## 3. Fill gaps through the library

Any element used twice, any interactive widget, or anything needing states → it's a component → **component-build**
skill (adds it to `components/ui`, docs, specimen). Single-use layout wrappers can stay in the page.
Never import `@base-ui/react` in route files; never restyle a library component from outside with color/spacing
overrides — add a variant instead. Layout classes (`grid`, `flex`, `gap-*`, `col-span-*`, `max-w-*`) on wrappers are fine.

## 4. Implement

- Next.js App Router: pages/layouts are Server Components; put interactivity in small `'use client'` leaves. Library
  components with Base UI are already client components — importing them from a server page is fine.
- Tokens only: `bg-background`, `bg-card`, `text-muted-foreground`, `border-border`, `p-6`, `gap-4`, `text-2xl`,
  `font-display`, `rounded-xl`, `shadow-sm`. No hex, no `bg-gray-*`, no `text-[15px]`, no `dark:` color overrides.
- Real content: plausible names, numbers, dates and copy in DESIGN.md's voice. No lorem ipsum, no "Item 1".
- Every list/table/feed has empty, loading and error renderings.
- Headings form a proper outline (one `h1`), landmarks (`header`, `main`, `nav`), labels on every input.
- Responsive: design 390 first, then `md:` / `lg:` enhancements. `min-w-0` on flex/grid children holding text.

Run `npm run design:lint -- --files <your files>` as you go (the plugin hook in Claude Code / Cursor does this on every write).

## 5. Verify

Run the **ui-verify** skill for the route(s): lint → `design:verify` → look at mobile/desktop × light/dark →
fix → re-verify (≤ 3 rounds).

## 6. Report

What you built, the components you added to the library (if any), screenshots (mobile + desktop), and open questions
(real data source, copy to confirm).
