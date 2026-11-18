# Playbook: adopt ui-foundry in an existing app

Use when an app already has UI (often inconsistent) and you want to pull it onto a system without a rewrite.

1. `init --no-components` (keep their library), then `npm run design:lint -- --scope code --json > design/.verify/baseline.json`.
   Summarise: counts per rule, top offending files, most-used raw colors/sizes.
2. **Extract, don't invent:** run `npm run design:inspect -- http://localhost:3000/<key routes>` on the app itself.
   The census of colors/type/radii is the de-facto system. Cluster it into roles and ramps in tokens.json
   (theme-from-inspiration §3–5), keeping existing colors where they're already decent.
3. Map their components into `components.md` (inventory reads any `components/ui` files; move or set `componentsDir`).
4. Migrate in slices, highest-traffic screens first: replace raw values with roles, `dark:` overrides with tokens,
   one-off widgets with library components. Re-run lint per slice; the counts should only go down.
5. When a rule reaches zero, turn on `--strict` in CI so it stays at zero.
