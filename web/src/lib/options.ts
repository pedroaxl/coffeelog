/** Ensure a currently-stored value stays selectable even if it's not in the set. */
export function withValue(options: string[], value: string | null | undefined): string[] {
  return value && !options.includes(value) ? [value, ...options] : options;
}
