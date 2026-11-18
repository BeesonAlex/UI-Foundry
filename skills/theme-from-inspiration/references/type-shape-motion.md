# Typography, shape, motion

## Families

- One UI family (sans) for all product text; optionally one **display** family for headlines; one mono for code/data.
- Pick from the brief, not habit. Inter/Roboto/Arial/system fonts are acceptable only when the brief is explicitly
  "invisible utility". Good starting pools (Google Fonts, free, next/font compatible):
  - Neutral-precise sans: Geist, Manrope, IBM Plex Sans, Public Sans, Figtree, Onest
  - Characterful sans: Space Grotesk, Bricolage Grotesque, Familjen Grotesk, Instrument Sans, Schibsted Grotesk
  - Serif display: Fraunces, Newsreader, Instrument Serif, Playfair Display, Source Serif 4
  - Mono: Geist Mono, JetBrains Mono, IBM Plex Mono, Martian Mono
- Match what you saw: `inspect` reports their families and the h1/h2/body ladder (size, weight, tracking).
  Choose a family with similar *structure* (geometric / grotesque / humanist / serif), not the same font.

### Wiring with next/font

```tsx
// app/layout.tsx
import { Instrument_Sans, Fraunces, JetBrains_Mono } from 'next/font/google';
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-ui' });
const display = Fraunces({ subsets: ['latin'], variable: '--font-headline', axes: ['opsz'] });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code' });
// <html className={`${sans.variable} ${display.variable} ${mono.variable}`}>
```

```json
"font": { "$type": "fontFamily",
  "sans":    { "$value": ["var(--font-ui)", "Instrument Sans", "ui-sans-serif", "system-ui", "sans-serif"] },
  "display": { "$value": ["var(--font-headline)", "Fraunces", "ui-serif", "Georgia", "serif"] },
  "mono":    { "$value": ["var(--font-code)", "JetBrains Mono", "ui-monospace", "monospace"] } }
```

Variable names must **not** be `--font-sans/--font-display/--font-mono` (those are the token outputs — a
self-reference would break). The family name after the variable lets `ui-verify` check rendered fonts.

## Scale

Keep the `xs…6xl` step names (Tailwind-compatible) and tune values:

- Product UI: ratio ~1.125–1.2, base 14–16px, tight steps at the bottom.
- Marketing/editorial: ratio ~1.25–1.333 on headings, base 16–18px.
- Large steps get negative tracking (`letterSpacing` -0.01 → -0.035em) and tighter line-height (1.05–1.2);
  small steps get none and line-height ≥ 1.4.
- Put the "Use for" note in each step's `$description` — it lands in the DESIGN.md table.

## Shape

Radius sets personality more than anything except color:

| Feel | xs / sm / md / lg / xl |
| --- | --- |
| Precise / technical | 1 / 2 / 4 / 6 / 8px |
| Neutral modern | 2 / 4 / 6 / 10 / 16px (starter) |
| Soft / friendly | 4 / 8 / 12 / 16 / 24px |

Controls usually use `md`, cards `lg`/`xl`, pills/avatars `full`. Elevation: choose **borders-first** (flat,
technical) or **shadows-first** (soft, layered) and say so in DESIGN.md §5.

## Motion

- `ease.standard` for most transitions; `enter` (decelerate) for things appearing; `exit` (accelerate) for leaving.
- Durations: fast 100–150ms (hover/press), base 180–240ms (popovers, toggles), slow 280–400ms (dialogs, drawers).
- Playful brands may add a spring-ish `cubic-bezier(0.34, 1.56, 0.64, 1)` for small elements only.
- The base layer already disables animation under `prefers-reduced-motion`.

## Density

Component heights live in `component.control.height-{sm,md,lg}`: compact 28/32/40px, comfortable 32/40/48px
(starter), spacious 36/44/52px. Adjust once here instead of per component.
