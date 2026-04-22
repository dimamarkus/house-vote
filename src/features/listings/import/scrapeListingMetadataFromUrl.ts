import { pickListingImportAdapter } from './adapters/registry';
import { extractListingCaptureFromHtml } from './extractListingCaptureFromHtml';
import { normalizeImportedListing } from './normalizeImportedListing';
import type { ListingImportAdapter } from './adapters/types';
import type { ListingImportCapture, NormalizedImportedListing } from './types';

/**
 * Source-specific adapters (Airbnb/Vrbo/Booking) expect to see real data on
 * the page. Generic / unknown adapters just return what they can. We only
 * trip the "empty extraction" guard for specific adapters so a catch-all
 * fallback still succeeds with partial data.
 */
function isSourceSpecificAdapter(adapter: ListingImportAdapter | null): boolean {
  if (!adapter) return false;
  return adapter.id !== 'OTHER' && adapter.id !== 'UNKNOWN' && adapter.id !== 'MANUAL';
}

function captureHasAnyUsefulData(capture: ListingImportCapture): boolean {
  return Boolean(
    capture.title ||
      capture.price ||
      capture.address ||
      capture.sourceDescription ||
      (capture.photoUrls && capture.photoUrls.length > 0),
  );
}

/**
 * Dev diagnostic: dump just enough of the fetched response to figure out
 * what the remote server actually returned. Runs only when a source-specific
 * adapter got a response but extracted zero fields (classic bot-wall shape).
 * Logs to stderr so it shows up in the Next.js dev terminal.
 */
function logEmptyExtractionDiagnostics(context: {
  inputUrl: string;
  response: Response;
  html: string;
}): void {
  const { inputUrl, response, html } = context;
  const docTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
  // Anti-bot walls often load a small HTML shell + a JS challenge. Any of
  // these markers is a near-certain indicator that the response isn't the
  // real property page.
  const challengeMarkers = [
    'captcha',
    'cloudflare',
    'cf-challenge',
    'px-captcha',
    'perimeterx',
    'datadome',
    'robot or human',
    'please enable javascript',
    'access denied',
  ];
  const markersFound = challengeMarkers.filter((marker) =>
    html.toLowerCase().includes(marker),
  );

  console.error('[listing-import] empty extraction diagnostic', {
    inputUrl,
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get('content-type'),
    contentLength: html.length,
    docTitle,
    challengeMarkers: markersFound,
    htmlPreview: html.slice(0, 1200),
  });
}

export async function scrapeListingMetadataFromUrl(
  inputUrl: string,
): Promise<NormalizedImportedListing> {
  const adapter = pickListingImportAdapter(inputUrl);
  if (adapter?.rejectInputUrl) {
    try {
      const rejection = adapter.rejectInputUrl(new URL(inputUrl));
      if (rejection) {
        throw new Error(rejection);
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Invalid URL');
    }
  }

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

  if (isSourceSpecificAdapter(adapter) && !captureHasAnyUsefulData(capture)) {
    logEmptyExtractionDiagnostics({ inputUrl, response, html });

    const hostname = (() => {
      try {
        return new URL(inputUrl).hostname;
      } catch {
        return 'the source site';
      }
    })();

    throw new Error(
      `Couldn't extract any listing data from ${hostname}. The page likely blocked server-side scraping ` +
        `(bot detection). See the dev server terminal for the raw response preview.`,
    );
  }

  return normalizeImportedListing(capture, 'URL_FETCH');
}
