# Visual review rubric

Score each 0–2 (0 = broken, 1 = acceptable, 2 = good). Anything at 0 must be fixed; aim for ≥ 13/16.
Name the evidence (element + screenshot) for every score below 2.

| # | Criterion | 2 looks like | Common failures |
| --- | --- | --- | --- |
| 1 | **Hierarchy** | One obvious focal point per view; title → key content → actions read in order | Everything the same size/weight; two competing primary buttons |
| 2 | **Alignment & rhythm** | Shared left edges; spacing from the scale; related items closer than unrelated (proximity) | Ragged edges, uniform gaps everywhere, cards with different paddings |
| 3 | **Density** | Matches DESIGN.md density; comfortable line lengths (45–80ch for prose) | Huge empty heroes in product UI; cramped tables; full-width paragraphs |
| 4 | **Color discipline** | Neutrals carry the page; primary used sparingly for the main action; status colors only for state | Rainbow of accents, primary everywhere, decorative red/green |
| 5 | **Typography** | Clear ladder (2–4 sizes per view), display face only where DESIGN.md allows, tight tracking only on large text | Browser-default h1s, too many sizes, all-bold, centered long text |
| 6 | **States & content** | Real-looking data; empty / loading / error considered; disabled legible | Lorem ipsum, "Item 1/2/3", missing empty state, spinners without context |
| 7 | **Responsive** | 390px layout is designed (stacking, nav, tap targets), not squeezed desktop | Overflow, tiny text, side-by-side columns at 390, hidden actions |
| 8 | **Brand fit** | Feels like DESIGN.md's adjectives in *both* themes; no Don't violated | Generic template look; dark mode muddy or vibrating |

## Quick heuristics

- **Squint test:** blur your attention — can you still find the main action and the page title?
- **Swap test:** would this screen look identical in any other product? Then it isn't using the brief.
- **Dark parity:** compare light and dark side by side — same hierarchy, no element disappearing (borders, dividers, disabled states).
- **Edge content:** longest realistic name, zero items, 1,000 items, error message — at least imagine each; render the cheap ones.

## Writing findings

`[severity] where — what — why it matters — fix at which layer`

> [high] /settings @390 dark — Save and Delete are side-by-side primary-weight buttons; destructive action competes
> with the main one — make Delete `variant="ghost"` inside a confirm Dialog (page composition).
