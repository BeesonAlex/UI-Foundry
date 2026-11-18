import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names; later Tailwind utilities win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Base UI accepts `className` as a string or a function of component state.
 * Merge library classes with either form so consumers can still override.
 */
export function withBase<State>(
  base: string,
  className?: string | ((state: State) => string | undefined),
): string | ((state: State) => string) {
  return typeof className === 'function' ? (state: State) => cn(base, className(state)) : cn(base, className);
}
