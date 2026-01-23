/**
 * Utility functions for the UGC marketplace redesign.
 *
 * The cn function concatenates multiple class strings conditionally. It
 * accepts any number of arguments, filters out falsy values and joins
 * them with a space. This simple helper mirrors the behaviour of the
 * popular clsx/cn helpers used in the original codebase.
 */
export function cn(...classes: (string | null | undefined | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}