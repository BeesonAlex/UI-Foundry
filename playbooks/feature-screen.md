# Playbook: feature screen in an existing system

The everyday loop. Use for "build the X page", "add a Y flow", "implement this mockup".

1. **ui-build §1–2** — read DESIGN.md + components.md; write the composition plan; list missing components.
2. **component-build** for each missing/extended component (stop and do these first — never inline them in the page).
3. **ui-build §4** — implement with tokens + library only; realistic content; empty/loading/error states.
4. **ui-verify** — `design:lint --changed` → `design:verify --routes <route> /design-system` → review screenshots → fix.
5. **design-lint** — `design:check` before commit; mention any new tokens/components in the PR description.

Escalate to the user (don't guess) when: the screen needs a new color role or font, a component API change would
break existing usages, or the mockup contradicts DESIGN.md's Do/Don't.
