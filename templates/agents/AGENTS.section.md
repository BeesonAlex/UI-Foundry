## Front-end: design system contract (ui-foundry)

This project's UI is generated from a design system. Before writing or changing any UI:

1. **Read** `design/DESIGN.md` (brand, rules, do/don't) and `design/components.md` (what exists, how to use it).
2. **Compose** screens only from `{{componentsDir}}` components + semantic tokens. Never import `@base-ui/react` outside `{{componentsDir}}`.
3. **Missing piece?** Add it at the source, then use it:
   - new color/size/radius/etc. → `design/tokens.json` → `npm run design:build`
   - new component or variant → `{{componentsDir}}/<name>.tsx` + `specimens.tsx` + `design/components.md` → `npm run design:inventory`
4. **Verify** before calling UI work done: `npm run design:lint` (must pass) and, with the dev server running,
   `npm run design:verify -- --routes <changed routes>`; then open the screenshots and review them against DESIGN.md.

Hard rules (enforced by `design:lint`):
- No raw colors (hex/rgb/hsl/oklch), no default Tailwind palette (`bg-blue-500`, `text-white`), no arbitrary
  color/spacing/type/radius/shadow values (`p-[13px]`, `text-[14px]`). Use semantic roles: `bg-primary`,
  `text-muted-foreground`, `border-border`, `rounded-lg`, `shadow-md`, `p-4`, `gap-6` (CSS: `var(--color-primary)`, `var(--space-4)`).
- No `dark:` color overrides — semantic tokens switch automatically with the theme.
- Never edit `design/generated/*` or the `ui-foundry:generated` blocks in markdown — they are rebuilt from tokens.
- Components are styled with **{{style}}** and react to state via data attributes (`data-disabled`, `data-open`, `data-starting-style`…).

Skills (`ui-foundry` plugin for Claude Code and Cursor; also mirrored in `.cursor/skills/` when installed with `--cursor`):
`theme-from-inspiration` · `design-lint` · `component-build` · `ui-build` · `ui-verify` · `foundry-setup`.
Multi-step flows (new project, feature screen, rebrand, adopting in an existing app): `design/playbooks/`.
