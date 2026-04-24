/**
 * Build up to two-letter initials from a display name. Uses the first
 * character of the first two whitespace-separated words, uppercased.
 * Returns `'?'` for null / empty / whitespace-only input so avatar
 * fallbacks always render something.
 *
 * Examples:
 *   `getInitials('Ada Lovelace')`      -> `'AL'`
 *   `getInitials('madonna')`           -> `'M'`
 *   `getInitials('Jean-Luc Picard')`   -> `'JP'`
 *   `getInitials(null)`                -> `'?'`
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';

  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return '?';

  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}
