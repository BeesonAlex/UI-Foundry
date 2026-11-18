## Button

**Use for:** triggering an action. **Not for:** navigation — use a link styled to match (see button.module.css).
**Variants:** `primary` (one per view, the main action) · `secondary` (alternative actions) · `outline` (neutral actions in forms/toolbars) · `ghost` (low-emphasis, toolbars, table rows) · `destructive` (irreversible actions, usually inside a confirm Dialog) · `link` (inline text actions).
**Sizes:** `sm` dense UI/tables · `md` default · `lg` marketing CTAs · `icon` square icon buttons (require `aria-label`).
**States:** `loading` shows a spinner + `aria-busy` and blocks clicks; `disabled` dims to 50%.

```tsx
<Button onClick={save} loading={isSaving}>Save changes</Button>
<Button variant="outline">Export</Button>
```

## Dialog

**Use for:** short focused tasks or confirmations that block the page. **Not for:** long forms (use a page) or passive info (use a Popover/Tooltip).
Anatomy: `Dialog` › `DialogTrigger` › `DialogContent` › `DialogTitle` (required) + `DialogDescription` + body + `DialogFooter` (actions right-aligned, primary last).
Swap the trigger element with Base UI's `render` prop: `<DialogTrigger render={<Button variant="outline" />}>Rename</DialogTrigger>`.

