import type { ListingImportSourceValue } from './types';

const AIRBNB_HOSTS = ['airbnb.com', 'www.airbnb.com'];
const VRBO_HOSTS = ['vrbo.com', 'www.vrbo.com'];

export function detectListingSource(inputUrl: string): ListingImportSourceValue {
  try {
    const hostname = new URL(inputUrl).hostname.toLowerCase();

    if (AIRBNB_HOSTS.includes(hostname) || hostname.endsWith('.airbnb.com')) {
      return 'AIRBNB';
    }

    if (VRBO_HOSTS.includes(hostname) || hostname.endsWith('.vrbo.com')) {
      return 'VRBO';
    }

    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}
