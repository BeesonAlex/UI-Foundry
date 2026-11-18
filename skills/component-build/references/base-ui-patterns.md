# Base UI patterns

Package: `@base-ui/react` (v1). Import per component: `import { Select } from '@base-ui/react/select'`.
Base UI is unstyled; every part accepts `className` (string **or** `(state) => string`) and exposes state as
data attributes. Check each component's API page for its exact parts and attributes.

## Common data attributes

| Attribute | Typical meaning |
| --- | --- |
| `data-disabled` | disabled |
| `data-open` / `data-closed` | popup/collapsible open state (also on triggers: `data-popup-open`) |
| `data-highlighted` | keyboard/pointer highlighted item in menus, selects, comboboxes |
| `data-checked` / `data-unchecked` | checkbox, switch, radio, toggle |
| `data-selected` | selected tab / option |
| `data-invalid` / `data-valid` / `data-touched` / `data-dirty` / `data-filled` / `data-focused` | Field state |
| `data-starting-style` / `data-ending-style` | present for one frame at enter / during exit — use for CSS transitions |
| `data-side` / `data-align` | positioned popups (`top`, `bottom`, …) — direction-aware animation |
| `data-orientation` | horizontal / vertical (tabs, slider, toolbar) |

Tailwind v4: `data-disabled:opacity-50`, `data-[side=top]:origin-bottom`, `data-starting-style:opacity-0`.
CSS: `.item[data-highlighted] { background: var(--color-accent); }`.

## App setup (once)

- Portaled popups need a stacking root: wrap the app body content in `<div className="isolate">` (or `isolation: isolate`
  in CSS) in `app/layout.tsx`.
- The ui-foundry base layer sets `body { position: relative }` for iOS Safari backdrops.

## Tailwind skeleton (popup component)

```tsx
'use client';
import * as React from 'react';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { cn, withBase } from '@/lib/cn';

/** Popover — non-modal floating panel anchored to a trigger. @status beta */
export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;

export function PopoverContent({ className, sideOffset = 8, children, ...props }:
  React.ComponentProps<typeof BasePopover.Popup> & { sideOffset?: number }) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner sideOffset={sideOffset}>
        <BasePopover.Popup
          className={withBase(cn(
            'rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
            'origin-(--transform-origin) transition-[opacity,scale] duration-(--duration-base) ease-enter',
            'data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
          ), className)}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}
```

`--transform-origin` (and `--anchor-width`, `--available-height`) are CSS variables Base UI sets on positioned popups;
`origin-(--transform-origin)` makes scale animations grow from the trigger.

## List-item pattern (Menu / Select / Combobox items)

```tsx
'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
'data-disabled:pointer-events-none data-disabled:opacity-50',
```

## Element swapping (`render`)

Base UI's equivalent of Radix `asChild`:

```tsx
<DialogTrigger render={<Button variant="outline" />}>Rename</DialogTrigger>
<Menu.Item render={<a href="/settings" />}>Settings</Menu.Item>
```

Don't nest a `<button>` inside a trigger — swap it with `render`.

## CSS Modules skeleton

```tsx
import styles from './switch.module.css';
<BaseSwitch.Root className={styles.root} data-size={size} {...props}>
  <BaseSwitch.Thumb className={styles.thumb} />
</BaseSwitch.Root>
```

```css
.root { width: calc(var(--control-height-sm) * 1.75); height: var(--control-height-sm); border-radius: var(--radius-full);
  background: var(--color-input); transition: background-color var(--duration-fast) var(--ease-standard); }
.root[data-checked] { background: var(--color-primary); }
.root:focus-visible { outline: var(--focus-ring-width) solid var(--color-ring); outline-offset: var(--focus-ring-offset); }
.thumb { /* … */ translate: 0; transition: translate var(--duration-fast) var(--ease-standard); }
.root[data-checked] .thumb { translate: calc(var(--control-height-sm) * 0.75); }
```

Caveat: some Next.js + Tailwind setups route every `*.css` file through `@tailwindcss/turbopack` as global CSS
(see `next.config.*` → `turbopack.rules["*.css"]`), which strips CSS Module scoping. `init` warns about it; in that
setup use Tailwind components.

## Non-Base-UI components

Plain elements, same rules. Card example:

```tsx
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-xl border border-border bg-card text-card-foreground', className)} {...props} />;
}
```
