'use client';

import * as React from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { Input as BaseInput } from '@base-ui/react/input';
import { cn, withBase } from '@/lib/cn';

/**
 * Field — label + control + description + error, wired for accessibility by Base UI.
 * Use <TextField> for the common case; compose Field parts for custom controls.
 * @sizes sm|md
 * @status stable
 */
export const Field = ({ className, ...props }: React.ComponentProps<typeof BaseField.Root>) => (
  <BaseField.Root className={withBase('flex flex-col gap-1.5', className)} {...props} />
);

export const FieldLabel = ({ className, ...props }: React.ComponentProps<typeof BaseField.Label>) => (
  <BaseField.Label className={withBase('text-sm font-medium text-foreground data-disabled:opacity-50', className)} {...props} />
);

export const FieldDescription = ({ className, ...props }: React.ComponentProps<typeof BaseField.Description>) => (
  <BaseField.Description className={withBase('text-xs text-muted-foreground', className)} {...props} />
);

export const FieldError = ({ className, ...props }: React.ComponentProps<typeof BaseField.Error>) => (
  <BaseField.Error className={withBase('text-xs font-medium text-destructive', className)} {...props} />
);

export const inputClasses = cn(
  'w-full rounded-md border border-input bg-background px-3 text-sm text-foreground',
  'placeholder:text-muted-foreground',
  'transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard',
  'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
  'data-invalid:border-destructive data-invalid:focus-visible:ring-destructive/30',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
);

export function Input({ className, size = 'md', ...props }: Omit<React.ComponentProps<typeof BaseInput>, 'size'> & { size?: 'sm' | 'md' }) {
  return <BaseInput className={withBase(cn(inputClasses, size === 'sm' ? 'h-(--control-height-sm)' : 'h-(--control-height-md)'), className)} {...props} />;
}

export type TextFieldProps = Omit<React.ComponentProps<typeof Input>, 'name' | 'className'> & {
  className?: string;
  name: string;
  label: string;
  description?: string;
  /** Error message shown when the field is invalid. */
  error?: string;
};

export function TextField({ label, description, error, name, className, ...inputProps }: TextFieldProps) {
  return (
    <Field name={name} invalid={Boolean(error)} className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Input {...inputProps} />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError match>{error}</FieldError>}
    </Field>
  );
}
