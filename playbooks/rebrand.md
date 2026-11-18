# Playbook: rebrand / theme revision

Use when the look changes but the product doesn't ("make it warmer", new brand guidelines, new references).

1. Snapshot the current state: `npm run design:verify -- --routes /design-system <2–3 key routes>` (before screenshots).
2. **theme-from-inspiration** in revision mode — change the fewest tokens possible; update brief.md and DESIGN.md prose.
   Typical levers, in order of impact: primary hue/step · neutral temperature · display font · radius scale · density.
3. `npm run design:check` — contrast must pass both modes; `docs/stray-color` flags prose describing old colors.
4. Re-verify the same routes; compare before/after screenshots side by side for each viewport/theme.
5. Components should need **no** edits. If one does, it was hard-coding something → fix it to use tokens
   (component-build), and note it.
6. Bump DESIGN.md `version` (minor for visual changes, major for role renames) and `updated`.
