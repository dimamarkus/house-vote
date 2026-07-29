import { cn } from '@/ui/utils/cn';

interface ListingRejectionNoteProps {
  rejectedByName?: string | null;
  rejectionReason?: string | null;
  className?: string;
}

/**
 * Compact "who + why" note for a rejected listing. Renders nothing when there
 * is no reason recorded (e.g. legacy rejections that predate this metadata).
 */
export function ListingRejectionNote({
  rejectedByName,
  rejectionReason,
  className,
}: ListingRejectionNoteProps) {
  const reason = rejectionReason?.trim();
  if (!reason) {
    return null;
  }

  const who = rejectedByName?.trim();

  return (
    <p
      className={cn(
        'rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700',
        className,
      )}
    >
      {who ? <span className="font-medium">Rejected by {who}</span> : <span className="font-medium">Rejected</span>}
      <span className="text-rose-600"> — {reason}</span>
    </p>
  );
}
