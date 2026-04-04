import { extractListingCaptureFromHtml } from './extractListingCaptureFromHtml';
import { normalizeImportedListing } from './normalizeImportedListing';
import type { NormalizedImportedListing } from './types';

export async function scrapeListingMetadataFromUrl(
  inputUrl: string,
): Promise<NormalizedImportedListing> {
  const response = await fetch(inputUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText} (Status ${response.status})`);
  }

  const html = await response.text();
  const { capture } = extractListingCaptureFromHtml(html, inputUrl);

  return normalizeImportedListing(
    capture,
    'URL_FETCH',
  );
}
