import type { LucideIcon } from 'lucide-react';
import { cn } from '@/ui/utils/cn';

interface TripMetaPillProps {
  icon: LucideIcon;
  label: string | number;
  /** Optional extra classes merged onto the pill container. */
  className?: string;
  /** `aria-label` override; defaults to the stringified label. */
  ariaLabel?: string;
}

/**
 * Shared rounded "meta" pill (icon + label) used by the trip dashboard
 * header and the public share page masthead. The base styling is
 * intentionally conservative (wrap-safe, breakpoint-light) so callers
 * can layer visual variants via `className` — e.g. `shadow-sm sm:text-base`
 * on the dashboard for a slightly more emphatic look.
 */
export function TripMetaPill({ icon: Icon, label, className, ariaLabel }: TripMetaPillProps) {
  return (
    <div
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium leading-snug',
        className,
      )}
      aria-label={ariaLabel ?? String(label)}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="wrap-break-word">{label}</span>
    </div>
  );
}
