---
name: design-lint
description: Lint and sync the design system — validate design/tokens.json, rebuild generated CSS/TS, keep DESIGN.md and components.md up to date with the tokens and component library, check WCAG contrast, and find off-system UI code (raw hex, default Tailwind palette, arbitrary values, dark: overrides, primitives used outside the library). Use after editing tokens, components or UI code, before commits/PRs, when asked to audit design consistency or "check the design system", or when CI's design-system job fails.
---

# design-lint

Everything is scripted; your job is running the right check and fixing findings **at the source**.

## Commands

| Command | What |
| --- | --- |
| `npm run design:build` | tokens.json → `design/generated/{tokens.css,tailwind.css,tokens.ts}` + DESIGN.md tables + `tokens_hash` |
| `npm run design:inventory` | scan `components/ui` → inventory table in components.md |
| `npm run design:lint` | all scopes; `--scope tokens,docs,code,contrast` · `--files a.tsx b.css` · `--changed` · `--json` · `--strict` |
| `npm run design:contrast` | readable contrast table, light + dark |
| `npm run design:check` | CI gate: build `--check` + inventory `--check` + lint |

With the ui-foundry plugin installed (Claude Code or Cursor), the hook already rebuilds after `tokens.json` edits, refreshes the inventory after component
edits, and lints each UI file you write (errors come back to you automatically). Still run `design:check` before
declaring work done.

## Workflow

1. `npm run design:check` (or `design:lint -- --changed` for a quick pass on the current diff).
2. Fix errors first, grouped by rule — see the table below. Never "fix" by editing `design/generated/*` or generated
   markdown blocks, and don't silence with `ui-foundry-ignore` unless the value is genuinely outside the system
   (third-party embed, brand logo SVG) — then add a comment saying why.
3. Re-run until clean. Warnings: fix when cheap; otherwise list them in your report.
4. Report: counts before → after, what you changed at the source (token added, component variant added…).

## Fixing findings

| Rule | Fix at the source |
| --- | --- |
| `tokens/ref`, `tokens/invalid-color` | Correct the `{primitive.…}` path / color syntax in tokens.json |
| `tokens/required-color` | Add the missing role (light + dark). Components depend on the full shadcn-style set |
| `tokens/dark-missing` | Add `$extensions.mode.dark` |
| `tokens/raw-semantic` | Move the literal into a primitive ramp step and reference it |
| `tokens/stale-generated`, `docs/hash` | `npm run design:build` |
| `contrast` | Move the semantic mapping one ramp step (e.g. muted-foreground 600 → 700); re-run contrast |
| `docs/section`, `docs/placeholder` | Write the missing DESIGN.md prose (theme-from-inspiration skill owns this) |
| `docs/stray-color` | Prose mentions a color that is no longer a token — update the sentence |
| `docs/inventory-stale` | `npm run design:inventory` |
| `docs/component-undocumented` | Add `## Name` usage section to components.md (use / not for / variants / example) |
| `docs/specimen-missing` | Add the component to `components/ui/specimens.tsx` |
| `code/raw-color`, `code/arbitrary-color`, `code/tw-palette` | Use the semantic role. If no role fits, the design needs one → add a token (and justify it), don't inline |
| `code/arbitrary-spacing\|type\|shape` | Snap to the scale (`p-4`, `text-sm`, `rounded-lg`). Repeated off-scale need → add a scale step / component token |
| `code/dark-variant` | Delete the `dark:` color class; if dark looks wrong the token mapping is wrong |
| `code/primitive-outside-library`, `code/raw-element` | Use or create the library component (component-build skill) |
| `code/inline-style`, `css/literal-value` | Class / CSS var; dynamic values via `style={{ '--x': value }}` are fine |
| `code/font-family` | `font-sans` / `font-display` / `font-mono` |

## Keeping markdown honest

DESIGN.md and components.md are contracts for future agents. When tokens or components change meaningfully:
- token *values* → tables regenerate automatically; check the surrounding prose still describes them.
- new role / new component / new variant → add the human explanation (when to use it, when not).
- removed things → delete their prose; `docs/stray-color` and inventory checks catch most leftovers.
Bump `version` and `updated` in DESIGN.md frontmatter for visible changes.

## CI

`init --ci` adds `.github/workflows/design-system.yml` (build/inventory `--check` + `design-lint --strict`) and a
pre-commit hook (`.githooks/pre-commit`; enable with `git config core.hooksPath .githooks`). A commented
`verify` job renders routes with Playwright if the user wants visual gates in CI.
