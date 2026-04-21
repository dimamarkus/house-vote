import { pickListingImportAdapter } from './adapters/registry';
import type { ListingImportSourceValue } from './types';

/**
 * Detects which `ListingSource` a URL belongs to by asking the adapter registry.
 * Returns `'UNKNOWN'` when no adapter matches; a follow-up PR will swap that
 * to `'OTHER'` once the generic adapter is wired in.
 */
export function detectListingSource(inputUrl: string): ListingImportSourceValue {
  const adapter = pickListingImportAdapter(inputUrl);
  return adapter?.id ?? 'UNKNOWN';
}
