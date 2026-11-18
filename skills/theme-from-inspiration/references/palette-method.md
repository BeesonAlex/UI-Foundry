# Palette method

## Why OKLCH

OKLCH lightness is perceptual: two colors at L 0.55 look equally light whatever the hue, so ramps from different
hues line up for contrast and a `600` means the same thing in brand, red and green. `ramp.mjs` fixes lightness per
step and only varies chroma, then gamut-maps into sRGB.

| Step | L | Typical role |
| --- | --- | --- |
| 50 | 0.975 | tinted page wash, accent bg (light) |
| 100 | 0.945 | muted/secondary surface (light) |
| 200 | 0.895 | borders (light) |
| 300 | 0.82 | strong borders, disabled fills |
| 400 | 0.73 | input borders, primary (dark mode) |
| 500 | 0.64 | ring, icons |
| 600 | 0.555 | text-on-light minimum for large type; muted text |
| 700 | 0.47 | primary (light), body-safe colored text |
| 800 | 0.385 | muted surface (dark) |
| 900 | 0.30 | card/popover (dark) |
| 950 | 0.225 | background (dark), foreground (light) |

Rule of thumb for WCAG AA on near-white: text needs L ≤ ~0.55; on the 950 background, text needs L ≥ ~0.70.

## Choosing seeds from inspiration

- **Brand hue**: the color that carries identity in the references — usually the most saturated color with meaningful
  share, *not* the dominant background. `inspect` reports OKLCH `H`; take the hue, choose your own chroma.
- **Distance from the source**: shift hue ≥ 10–15° or change chroma noticeably if a reference is a competitor.
  Borrow relationships (one loud accent on quiet neutrals), not values.
- **Neutral temperature**: warm (H 40–80), cool (H 230–270) or brand-tinted (brand H). Chroma 0.005–0.02.
  Pure gray (C 0) reads as default/template.
- **Status hues**: red ≈ 25–30, green ≈ 145–160, amber ≈ 70–85. Nudge them toward the palette's temperature so they
  belong, but keep them unambiguous.
- **Avoid the defaults** unless the brief demands them: indigo/violet 260–290 on white with Inter is the generic AI look.

## Default semantic mapping (adjust per brief)

| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| background | neutral.0/50 | neutral.950 | `0` is a near-white you add by hand (L 0.99–1) |
| foreground | neutral.950 | neutral.50 | |
| card / popover | neutral.0 | neutral.900 | dark surfaces get *lighter* as they rise |
| primary | brand.600–700 | brand.400–500 | one step lighter in dark mode |
| primary-foreground | neutral.0 | neutral.950 | check contrast both ways |
| secondary / muted | neutral.100 | neutral.800 | |
| muted-foreground | neutral.600–700 | neutral.300–400 | must pass 4.5 on muted *and* background |
| accent | brand.50 | brand.900 | hover/selected rows & menu items |
| accent-foreground | brand.800 | brand.100 | |
| destructive / success | red/green.700 | red/green.400 | |
| warning | amber.300 | amber.300 | dark text on it: warning-foreground = amber.950 |
| border | neutral.200 | neutral.800 | decorative; 1.3:1 is enough |
| input | neutral.400–500 | neutral.500–600 | form boundaries need 3:1 (WCAG 1.4.11) |
| ring | brand.500 | brand.400 | 3:1 vs background |

## Dark mode is not inversion

- Lower chroma slightly for large dark surfaces; saturated colors vibrate on dark.
- Shadows do little on dark — rely on surface steps (950 → 900 → 800) and borders; make shadow tokens darker/stronger.
- Re-check every pair with `npm run design:contrast`; fix by moving the mapping one step, not by adding colors.

## Extra roles

Add only with a concrete use: `chart-1…5` (distinct hues at equal L), `brand-subtle` (marketing washes),
`sidebar`/`sidebar-foreground` (app shells). Each new role needs light + dark and, if it carries text, a `-foreground`
partner plus a `contrast.pairs` entry in `design.config.json`.
