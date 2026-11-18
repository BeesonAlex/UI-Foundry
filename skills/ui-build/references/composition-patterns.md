# Composition patterns

Skeletons using semantic tokens. Swap in library components; promote anything repeated to `components/ui`.

## Page shell (app)

```tsx
<div className="isolate min-h-dvh bg-background text-foreground">
  <header className="border-b border-border">…nav…</header>
  <main className="mx-auto w-full max-w-content px-4 py-8 md:px-6 md:py-10">
    <PageHeader title="Billing" description="Plan, usage and invoices." actions={<Button>Upgrade plan</Button>} />
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 min-w-0">…</section>
      <aside className="min-w-0">…</aside>
    </div>
  </main>
</div>
```

PageHeader: `h1` `font-display text-3xl font-semibold` + `text-muted-foreground` description; actions right on md+,
stacked below on mobile.

## Settings form

- Sections as `grid gap-6 md:grid-cols-[16rem_1fr]` — label/description column left, fields right.
- Separate sections with `border-t border-border pt-8`.
- One primary "Save changes" per form, aligned with fields; secondary/cancel as `ghost`. Destructive zone last, in its
  own bordered card, with confirm Dialog.

## Dashboard

- KPI row: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` of Cards; number `text-3xl font-semibold tabular-nums`,
  label `text-sm text-muted-foreground`, delta as Badge (success/destructive roles).
- Charts: colors from `tokens.color.chart-*` (add chart roles in tokens.json if missing) via `tokens.ts`.
- Tables: `text-sm`, header `text-muted-foreground font-medium`, row hover `hover:bg-muted/50`, numbers right-aligned
  `tabular-nums`. On mobile: card list or horizontal scroll container with visible affordance.

## Marketing / landing

- Hero: `py-16 md:py-24`, headline `font-display text-4xl md:text-6xl` with the scale's tracking, sub-copy
  `text-lg text-muted-foreground max-w-prose`, one primary CTA + one secondary.
- Sections alternate `bg-background` / `bg-muted` (not random tints); consistent section padding.
- Feature grids: avoid the generic "three icon cards" unless content truly is three parallel items; vary with
  an asymmetric layout, a product screenshot, or a list.

## Empty / loading / error

- Empty: short title, one sentence of what will appear, one action. `text-center` only inside a bounded panel.
- Loading: skeleton blocks `bg-muted animate-pulse rounded-md` matching final layout (no layout shift).
- Error: inline callout with `destructive` role text + retry; never only a toast for blocking errors.

## Responsive checks

- 390: single column, full-width primary actions at the bottom of forms, nav collapses (Drawer/Menu component).
- 768: two columns where content allows.
- 1440: content capped at `max-w-content`; no lines over ~80ch.
