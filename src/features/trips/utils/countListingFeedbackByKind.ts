import {
  LISTING_FEEDBACK_KIND,
  type ListingFeedbackKind,
} from '@/features/trips/constants/listing-feedback';

export type CountableListingFeedback = {
  kind: ListingFeedbackKind;
  hiddenAt?: Date | string | null;
};

export type ListingFeedbackCounts = Record<ListingFeedbackKind, number>;

export function countListingFeedbackByKind(
  feedback: readonly CountableListingFeedback[],
  options: { includeHidden?: boolean } = {},
): ListingFeedbackCounts {
  const counts: ListingFeedbackCounts = {
    [LISTING_FEEDBACK_KIND.COMMENT]: 0,
    [LISTING_FEEDBACK_KIND.PRO]: 0,
    [LISTING_FEEDBACK_KIND.CON]: 0,
  };

  for (const item of feedback) {
    if (!options.includeHidden && item.hiddenAt != null) {
      continue;
    }

    counts[item.kind] += 1;
  }

  return counts;
}
