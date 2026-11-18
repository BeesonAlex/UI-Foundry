'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn, withBase } from '@/lib/cn';

/**
 * Dialog — modal surface for focused tasks that must be completed or dismissed.
 * Compose: <Dialog><DialogTrigger render={<Button />}>Open</DialogTrigger><DialogContent>…</DialogContent></Dialog>
 * @status stable
 */
export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={cn(
          'fixed inset-0 bg-foreground/40 backdrop-blur-[2px]',
          'transition-opacity duration-(--duration-base) ease-standard',
          'data-starting-style:opacity-0 data-ending-style:opacity-0',
        )}
      />
      <BaseDialog.Popup
        className={withBase(cn(
          'fixed left-1/2 top-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
          'rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none',
          'transition-[opacity,scale] duration-(--duration-base) ease-enter',
          'data-starting-style:scale-95 data-starting-style:opacity-0',
          'data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:ease-exit'), className)}
        {...props}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title className={withBase('font-display text-xl font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description className={withBase('mt-2 text-sm text-muted-foreground', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />;
}
