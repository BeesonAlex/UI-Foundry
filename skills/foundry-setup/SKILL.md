---
name: foundry-setup
description: Install the ui-foundry design-system workspace into a React/Next.js project — design/ folder (tokens.json, DESIGN.md, components.md, tools), Base UI component seeds, /design-system specimen route, global CSS wiring, npm scripts, AGENTS.md, optional Cursor rules and CI. Use when a project has no design/design.config.json yet, or the user asks to set up / reinstall / upgrade ui-foundry.
---

# foundry-setup

Scaffolds everything the other ui-foundry skills rely on. Safe to re-run: existing design files are kept,
`design/tools/` is refreshed to the plugin's version.

## 1. Check the project

- Must be a React project with `package.json` (Next.js App Router gets the specimen route automatically).
- Detect styling: Tailwind v4 in deps → `--style tailwind` (default). No Tailwind → `--style css-modules`.
  Tailwind v3 → tell the user ui-foundry targets v4 (`npx @tailwindcss/upgrade`) before continuing.
- If `design/design.config.json` already exists this is an upgrade: run init without `--force` (keeps their files).

Ask at most one question, only if it changes the result: "Add Cursor rules/skills and a CI check too?"
(default yes for both when the repo uses Cursor / has `.github/`).

## 2. Run init

```bash
node "${CLAUDE_PLUGIN_ROOT}/tools/init.mjs" --install [--cursor] [--ci] [--style tailwind|css-modules]
```

`${CLAUDE_PLUGIN_ROOT}` is set in Claude Code. In Cursor, or anywhere it is empty, the plugin root is two levels up
from this SKILL.md (`<this skill dir>/../../tools/init.mjs`); if you can't tell where that is, locate it with
`find ~/.cursor/plugins ~/.claude/plugins -path '*ui-foundry*/tools/init.mjs' 2>/dev/null | head -1`.

`--cursor` writes a project-level Cursor rule and copies the skills into `.cursor/skills/`. Skip it when everyone on the
project uses the ui-foundry Cursor plugin (it already provides both); use it so teammates without the plugin get them.

Flags: `--no-components` (keep an existing library untouched), `--no-specimen`, `--components-dir src/components/ui`,
`--force` (overwrite design files — never use on an existing system without asking).

What it does: creates `design/` · seeds `components/ui` with Button, Dialog, Field (Base UI) + `specimens.tsx` ·
adds `app/design-system/` · imports `design/generated/tailwind.css` (or `tokens.css`) into `globals.css` and comments
out create-next-app's demo variables · adds `design:*` npm scripts · writes a ui-foundry section in `AGENTS.md` and
makes `CLAUDE.md` import it · `.gitignore`s `design/.verify/`.

If `npx playwright install chromium` fails (offline/CI sandbox), that's fine: verify/inspect fall back to a system Chrome.

## 3. One manual edit: stacking root for popups

Base UI portals (Dialog, Popover, Menu…) need the app content in its own stacking context. In `app/layout.tsx`
wrap the children: `<body …><div className="isolate flex min-h-full flex-col">{children}</div></body>`
(CSS Modules projects: a wrapper with `isolation: isolate`). Keep the next/font `variable` classes on `<html>`.

## 4. Confirm it works

```bash
npm run design:check          # tokens ↔ generated ↔ docs in sync, lint, contrast
npx tsc --noEmit              # seeds type-check
npm run dev                   # then open /design-system
```

`design:check` will report the create-next-app demo page (`app/page.tsx`) — raw `zinc` classes, hex values. That's
expected: either replace the page (ui-build skill) or leave it and tell the user.
Placeholder warnings in DESIGN.md are expected until the theme skill runs.

## 5. Hand off

Tell the user, briefly: what was created, that the starter theme is a neutral placeholder, and that the next step is
**theme-from-inspiration** (send links or images). Mention `npm run dev` → `/design-system` to see the system.
