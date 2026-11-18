---
name: component-build
description: Build or extend a reusable React UI component in the project's component library (components/ui) on Base UI primitives, styled only with design tokens (Tailwind v4 or CSS Modules), with full states, accessibility, docs in components.md and a specimen. Use when a screen needs a component that doesn't exist yet, when adding a variant/size/state to an existing one, when promoting a repeated pattern into the library, or when asked to "build a component", "add a Select/Tabs/Toast…", or create a component library.
---

# component-build

A library component is a contract: one API, every state designed, only tokens, documented, visible on the specimen
page. Build it once so screens never need one-off markup.

Read first: `design/DESIGN.md` (shape/motion/voice), `design/components.md` (conventions + what exists),
`design/design.config.json` (`componentStyle`, `componentsDir`). Look at an existing component in the library
(Button/Dialog/Field seeds) and match its structure exactly.

## 1. Decide the shape (before code)

- **Does it already exist?** Extend (new variant/size/prop) instead of creating a sibling. `npm run design:inventory -- --json`.
- **Primitive:** interactive widgets wrap Base UI (`@base-ui/react/<part>` — Accordion, Autocomplete, Avatar, Button,
  Checkbox, Collapsible, Combobox, Context Menu, Dialog, Alert Dialog, Drawer, Field, Fieldset, Form, Input, Menu,
  Menubar, Meter, Navigation Menu, Number Field, OTP Field, Popover, Preview Card, Progress, Radio Group, Scroll Area,
  Select, Separator, Slider, Switch, Tabs, Toast, Toggle, Toggle Group, Toolbar, Tooltip). Never hand-roll focus
  management, keyboard nav or ARIA that Base UI provides. Pure layout/display pieces (Card, Badge, EmptyState,
  PageHeader) are plain elements.
- **API:** write the usage you want first (2–3 JSX snippets), then implement. Vocabulary: `variant`, `size`, `disabled`,
  `loading`, `invalid`; compound parts as `ComponentPart` exports; element swap via Base UI `render` prop. Max ~6 variants.
- **States matrix:** list which apply — default, hover, active, focus-visible, disabled, loading, invalid, open/closed,
  checked/selected, highlighted, empty, overflowing text, RTL. Each must be visibly designed.

Check the exact parts/props/data attributes on the Base UI docs page for the primitive
(`https://base-ui.com/react/components/<name>`) — don't guess APIs.

## 2. Implement

File: `<componentsDir>/<kebab-name>.tsx`, PascalCase exports, `'use client'` if it uses Base UI or hooks.
Follow `references/base-ui-patterns.md` for the style you're in:

- **Tailwind** (`componentStyle: tailwind`): `cva` for variants, `withBase()` from `@/lib/cn` so consumers can pass
  string *or* state-function `className`, state styling via `data-*:` variants (`data-disabled:`, `data-open:`,
  `data-highlighted:`, `data-starting-style:`…), `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`.
- **CSS Modules** (`componentStyle: css-modules`): `<name>.module.css`, variants as `data-variant`/`data-size`
  attributes, only `var(--…)` token values.

Token rules: semantic colors only (`bg-primary`, `text-muted-foreground`, `border-input`), spacing scale, `rounded-*`,
`shadow-*`, `text-*`, `h-(--control-height-md)`, `duration-(--duration-fast) ease-standard`. Need a value that doesn't
exist? Add it to `design/tokens.json` (usually a `component.*` token) and `npm run design:build` — never inline it.

Add the JSDoc header: one-line purpose, `@status beta|stable`, and `@variants`/`@sizes` if not using cva.
Export it from `<componentsDir>/index.ts`.

## 3. Document & show

1. `components/ui/specimens.tsx` — add an entry rendering every variant, size and key state (disabled, loading,
   invalid, long text). Keep that file server-safe; stateful demos go in their own `'use client'` file.
2. `design/components.md` — add `## Name`: **Use for / Not for**, variants with when-to-use, sizes, states, a11y notes,
   1–2 code examples. (Template at the bottom of components.md.)
3. `npm run design:inventory`

## 4. Verify (don't skip)

```bash
npm run design:lint -- --scope code,docs      # zero errors
npx tsc --noEmit
npm run design:verify -- --routes /design-system   # dev server running
```

Then **look at the specimen screenshots in light and dark** and walk the checklist in
`references/component-checklist.md` (keyboard, focus ring visible on every variant, disabled/invalid legible, text
overflow, mobile width). Open interactive pieces in the browser tool if available (menus, dialogs) — static
screenshots don't show open states.

## 5. Report

Component name, API summary (variants/sizes/props), what tokens you added (if any), and the specimen screenshot.
