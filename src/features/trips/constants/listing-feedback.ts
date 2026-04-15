export const LISTING_FEEDBACK_KIND = {
  COMMENT: 'COMMENT',
  PRO: 'PRO',
  CON: 'CON',
} as const;

export type ListingFeedbackKind = typeof LISTING_FEEDBACK_KIND[keyof typeof LISTING_FEEDBACK_KIND];

type ListingFeedbackConfig = {
  emptyMessage: string;
  placeholder: string;
  submitLabel: string;
  successMessage: string;
  singularLabel: string;
  pluralLabel: string;
};

const LISTING_FEEDBACK_CONFIG: Record<ListingFeedbackKind, ListingFeedbackConfig> = {
  [LISTING_FEEDBACK_KIND.COMMENT]: {
    emptyMessage: 'No comments yet. Start the discussion for this listing.',
    placeholder: 'Add your thoughts about this place...',
    submitLabel: 'Post comment',
    successMessage: 'Comment added.',
    singularLabel: 'Comment',
    pluralLabel: 'Comments',
  },
  [LISTING_FEEDBACK_KIND.PRO]: {
    emptyMessage: 'No pros yet. Add something this place does well.',
    placeholder: 'What is a plus for this place?',
    submitLabel: 'Add pro',
    successMessage: 'Pro added.',
    singularLabel: 'Pro',
    pluralLabel: 'Pros',
  },
  [LISTING_FEEDBACK_KIND.CON]: {
    emptyMessage: 'No cons yet. Add a tradeoff to keep in mind.',
    placeholder: 'What is a downside for this place?',
    submitLabel: 'Add con',
    successMessage: 'Con added.',
    singularLabel: 'Con',
    pluralLabel: 'Cons',
  },
};

export function getListingFeedbackConfig(kind: ListingFeedbackKind) {
  return LISTING_FEEDBACK_CONFIG[kind];
}

export function getListingFeedbackBadgeLabel(kind: ListingFeedbackKind) {
  return getListingFeedbackConfig(kind).singularLabel;
}
