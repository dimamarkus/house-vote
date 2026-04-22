import type { ListingImportAdapter } from './types';
import { bookingAdapter } from './bookingAdapter';
import { expediaAdapter } from './expediaAdapter';
import { hiltonAdapter } from './hiltonAdapter';
import { hyattAdapter } from './hyattAdapter';
import { marriottAdapter } from './marriottAdapter';

/**
 * Hotel-brand adapter scaffolds. **Intentionally not exported from
 * `registry.ts`** — until we:
 *   1. collect HTML samples for each brand,
 *   2. tighten the selectors against those samples, and
 *   3. add per-brand `ListingSource` enum values,
 * routing every URL through the generic adapter is still the safer call.
 *
 * Importing them from this barrel keeps them on the TypeScript hot-path so
 * interface changes to `ListingImportAdapter` fail the build here instead of
 * rotting silently as dead files. Ops-wise, flipping any one of them into
 * production is a 3-line change to `registry.ts`.
 */
export const HOTEL_ADAPTER_TEMPLATES: readonly ListingImportAdapter[] = [
  bookingAdapter,
  expediaAdapter,
  marriottAdapter,
  hiltonAdapter,
  hyattAdapter,
];
