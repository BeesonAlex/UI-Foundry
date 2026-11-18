# Playbook: new project → first on-brand screen

Use when starting a front-end from zero (or adopting ui-foundry in a young app). ~1 session.

1. **foundry-setup** — `init --install --cursor --ci`, wrap children in `isolate`, `npm run dev`, open `/design-system`.
2. **theme-from-inspiration** — user sends 2–5 links/images + 3 adjectives.
   inspect → brief.md (confirm with user) → ramps → semantic mapping → type/shape/motion → DESIGN.md → `design:check`
   → verify `/design-system` light/dark → show the user the specimen.
3. **component-build** — for the first screen's missing pieces only (typically PageHeader, Card, Badge, Table/List,
   EmptyState, Select/Menu). Each: specimen + docs + verify.
4. **ui-build** — the first real screen, planned in writing first.
5. **ui-verify** — mobile/desktop × light/dark; rubric ≥ 13/16; fix ≤ 3 rounds.
6. **design-lint** — `npm run design:check` green; commit tokens, generated files, docs and components together.

Exit criteria: `design:check` passes, DESIGN.md has no placeholders, specimen + first screen reviewed in both themes.
