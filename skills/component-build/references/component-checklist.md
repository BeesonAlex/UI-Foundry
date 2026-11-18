# Component checklist

Walk this before reporting a component as done. Every "no" is a fix, not a footnote.

## API
- [ ] Usage reads naturally in 1–2 lines for the common case; props named with the shared vocabulary
      (`variant`, `size`, `disabled`, `loading`, `invalid`).
- [ ] `className` passes through (string or Base UI state function) and wins over library classes.
- [ ] Refs reach the underlying element (React 19: `ref` is a normal prop — just spread props).
- [ ] No props that leak styling decisions (`color="#…"`, `padding={13}`) — offer variants instead.

## Tokens
- [ ] `npm run design:lint -- --files <file>` → 0 errors.
- [ ] Heights from `--control-height-*`, motion from `--duration-*`/`ease-*`, focus from `ring`.
- [ ] Looks right in **dark** without a single `dark:` class.

## States (each visibly distinct)
- [ ] hover · active/pressed · focus-visible (ring visible on *every* variant, incl. on colored fills)
- [ ] disabled (still legible) · loading (if async) · invalid (+ message association via Field)
- [ ] open/closed transitions use `data-starting-style`/`data-ending-style`; nothing pops in without motion,
      nothing animates under `prefers-reduced-motion` (base layer handles global reduction)
- [ ] long text: truncation or wrapping decided; no layout break at 390px wide

## Accessibility
- [ ] Keyboard: Tab reaches it; Enter/Space/Escape/arrow keys behave per the Base UI pattern.
- [ ] Accessible name for icon-only controls (`aria-label`); decorative SVGs `aria-hidden`.
- [ ] Contrast ≥ 4.5:1 for text, ≥ 3:1 for boundaries/icons in both themes (verify reports failures).
- [ ] Tap target ≥ 24×24px (44 on touch-first surfaces).

## Docs & specimen
- [ ] `## Name` section in components.md: use for / not for / variants / sizes / example.
- [ ] Specimen shows every variant × key states; `npm run design:inventory` run.
- [ ] Exported from `components/ui/index.ts`.
