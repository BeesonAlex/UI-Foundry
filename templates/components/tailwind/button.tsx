'use client';

import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { withBase } from '@/lib/cn';

/**
 * Button — triggers an action. For navigation, style a link with `buttonVariants()`.
 * @status stable
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'rounded-md font-sans font-medium',
    'transition-[background-color,color,box-shadow,opacity] duration-(--duration-fast) ease-standard',
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'data-disabled:pointer-events-none data-disabled:opacity-50',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-(--control-height-sm) px-3 text-sm',
        md: 'h-(--control-height-md) px-4 text-sm',
        lg: 'h-(--control-height-lg) px-6 text-base',
        icon: 'size-(--control-height-md)',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ComponentProps<typeof BaseButton> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner, sets aria-busy and blocks interaction. */
    loading?: boolean;
  };

export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <BaseButton
      className={withBase(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </BaseButton>
  );
}

function Spinner() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="animate-spin motion-reduce:animate-none">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
