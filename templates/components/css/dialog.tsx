'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import styles from './dialog.module.css';

/**
 * Dialog — modal surface for focused tasks that must be completed or dismissed.
 * @status stable
 */
export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

export function DialogContent({ children, ...props }: Omit<React.ComponentProps<typeof BaseDialog.Popup>, 'className'>) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={styles.backdrop} />
      <BaseDialog.Popup className={styles.popup} {...props}>
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export const DialogTitle = (props: Omit<React.ComponentProps<typeof BaseDialog.Title>, 'className'>) => <BaseDialog.Title className={styles.title} {...props} />;
export const DialogDescription = (props: Omit<React.ComponentProps<typeof BaseDialog.Description>, 'className'>) => <BaseDialog.Description className={styles.description} {...props} />;
export const DialogFooter = (props: React.ComponentProps<'div'>) => <div className={styles.footer} {...props} />;
