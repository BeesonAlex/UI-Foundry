'use client';

import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import styles from './button.module.css';

/**
 * Button — triggers an action. Styled with CSS Modules + design tokens; variants/sizes are
 * data attributes so the stylesheet stays declarative.
 * @variants primary|secondary|outline|ghost|destructive|link
 * @sizes sm|md|lg|icon
 * @status stable
 */
export type ButtonProps = React.ComponentProps<typeof BaseButton> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
};

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className, children, ...props }: ButtonProps) {
  return (
    <BaseButton
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={typeof className === 'function' ? (s) => `${styles.button} ${className(s) ?? ''}` : `${styles.button} ${className ?? ''}`}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden />}
      {children}
    </BaseButton>
  );
}
