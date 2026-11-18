# UI Foundry

A lightweight front-end skill pack that makes coding agents produce **consistent, on-brand UI** in React/Next.js.
The design system lives in the repo as files and tools the agent reads and runs on every task:

```
design/
  tokens.json          source of truth (W3C DTCG): primitive → semantic → component tiers, light + dark
  DESIGN.md            the brief for humans + agents (brand, rules, do/don't) — token tables auto-generated
  components.md        library catalogue — inventory table auto-generated, usage written by hand
  design.config.json   styling mode, paths, lint + verify settings
  generated/           tokens.css · tailwind.css (v4 @theme) · tokens.ts   ← never edited by hand
  inspiration/         per-source captures + brief.md
  playbooks/           multi-step flows
  tools/               zero-dependency Node scripts (verify/inspect use Playwright)
components/ui/         Base UI–based library + specimens.tsx
app/design-system/     living specimen page (dev only), screenshot target for verification
```

Stack opinions: **React 19 / Next.js App Router**, **Base UI** (`@base-ui/react`) primitives, **Tailwind v4** or
**CSS Modules** — both read the same CSS variables, so `bg-primary` and `var(--color-primary)` are the same token.
Semantic color names follow the shadcn convention (`background`, `primary-foreground`, `muted-foreground`, …)
because agents already know them well.

## Skills

| Skill | Use it to | Key tools |
| --- | --- | --- |
| `foundry-setup` | install the workspace into a project | `tools/init.mjs` |
| `theme-from-inspiration` | links/images/words → palette, type, shape, motion, DESIGN.md | `design:inspect`, `design:ramp`, `design:contrast` |
| `design-lint` | keep tokens ↔ CSS ↔ docs ↔ code in sync; catch off-system code | `design:build`, `design:inventory`, `design:lint`, `design:check` |
| `component-build` | add/extend library components with all states, docs, specimen | Base UI patterns + checklist |
| `ui-verify` | screenshots × viewports × themes + automated checks + visual rubric | `design:verify` |
| `ui-build` | compose screens from the library, plan-first, then verify | composition patterns |

Plus a **post-edit hook** (Claude Code and Cursor): editing `tokens.json` rebuilds generated files (and reports broken
refs or contrast regressions); editing a component refreshes the inventory; every UI file write is linted and errors are
fed straight back to the agent.

## Install

This repo is a plugin for both **Claude Code** and **Cursor**. The skills, tools and templates are shared; each editor
has its own manifest:

```
.claude-plugin/plugin.json        Claude Code plugin    → skills/, hooks/hooks.json
.claude-plugin/marketplace.json   Claude Code marketplace
.cursor-plugin/plugin.json        Cursor plugin         → skills/, rules/, hooks/hooks.cursor.json
.cursor-plugin/marketplace.json   Cursor marketplace
```

### Claude Code

```bash
/plugin marketplace add <path-or-git-url-of-this-folder>
/plugin install ui-foundry@ui-foundry
```

### Cursor

From a Git repo: add it as a team marketplace in Cursor's plugin settings (or install it from the marketplace once it's
listed). For local development, symlink the checkout into Cursor's local plugins folder and reload the window:

```bash
mkdir -p ~/.cursor/plugins/local
ln -s "$(pwd)" ~/.cursor/plugins/local/ui-foundry
```

The Cursor plugin provides the six skills, a glob-scoped `ui-foundry` rule (active only in projects with
`design/design.config.json`), and hooks: `afterFileEdit` runs the rebuilds, `postToolUse` lints and returns findings as
`additional_context`.

### Then, in a project

Ask the agent to *"set up ui-foundry"* (runs `foundry-setup`), or run init directly:

```bash
node <path-to-ui-foundry>/tools/init.mjs --install [--cursor] [--ci]
```

`--cursor` also writes `.cursor/rules/ui-foundry.mdc` and copies the skills to `.cursor/skills/`, so teammates without
the plugin, and agents other than Cursor and Claude Code, get them too. Init always adds a ui-foundry section to
`AGENTS.md` (read by Cursor, Codex and most agents; `CLAUDE.md` imports it). The npm scripts work everywhere.

## Daily commands

```bash
npm run design:build       # after editing design/tokens.json
npm run design:check       # CI gate: generated + docs in sync, lint, contrast
npm run design:lint -- --changed
npm run design:verify -- --routes /design-system /your/route     # dev server running
npm run design:inspect -- https://example.com ./moodboard.png
npm run design:ramp -- brand="#0f766e" neutral="#0f766e" --neutral neutral
```

## What the checks catch

- **Tokens:** broken `{refs}`, cycles, invalid colors, missing semantic roles, missing dark values, semantic tokens with raw values, stale generated files.
- **Contrast:** configurable WCAG pairs (AA text, 3:1 UI) in light and dark.
- **Docs:** missing DESIGN.md sections, unfilled placeholders, `tokens_hash` drift, prose mentioning colors that are no longer tokens, stale inventory, undocumented components, components missing from the specimen.
- **Code:** raw hex/rgb/hsl/oklch, default Tailwind palette (`bg-blue-500`, `text-white`), arbitrary color/spacing/type/shape values, `dark:` color overrides, Base UI imported outside the library, raw `<button>/<input>` in feature code, literal inline styles, literal CSS values.
- **Rendered (verify):** off-palette colors (OKLab ΔE vs tokens, per theme), WCAG contrast on actual composited backgrounds, fonts/sizes off the scale, horizontal overflow, tap targets, accessible names, image alts, console errors, axe-core (if installed).

Tailwind's default palette is removed (`--color-*: initial`), so off-system classes render *nothing* — easy to spot.

## Notes & limits

- Tailwind v4 only (uses `@theme static` and `@custom-variant`). Tailwind v3 → `npx @tailwindcss/upgrade`.
- Some Next.js + Tailwind setups route all `*.css` through `@tailwindcss/turbopack` as global CSS, which breaks CSS
  Module scoping; init warns, and the specimen page uses prefixed global CSS so it works either way.
- verify/inspect need Playwright (`npm i -D playwright && npx playwright install chromium`); they fall back to a
  system Chrome (`CHROME_PATH`) if the bundled browser isn't installed.
- The lint is regex-based by design (fast, zero deps, readable). Suppress a genuine exception with a
  `ui-foundry-ignore` comment on or above the line, and say why.
