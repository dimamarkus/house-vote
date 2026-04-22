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

interface BotWallFingerprintResult {
  readonly likelyBotWall: boolean;
  readonly matchedTextMarkers: readonly string[];
  readonly matchedStructuralMarkers: readonly string[];
}

/**
 * Fingerprint the response for "silent JS challenge" shells (Booking's
 * intermediate page, Akamai Bot Manager interstitials, etc.) in addition
 * to the obvious captcha/CDN markers. Any one marker is weak signal; two
 * or more is strong signal.
 */
function fingerprintBotWall(args: {
  status: number;
  html: string;
  docTitle: string | null;
}): BotWallFingerprintResult {
  const { status, html, docTitle } = args;
  const lowerHtml = html.toLowerCase();

  const textMarkers = [
    'captcha',
    'cloudflare',
    'cf-challenge',
    'px-captcha',
    'perimeterx',
    'datadome',
    'akamai',
    'incapsula',
    'robot or human',
    'please enable javascript',
    'access denied',
    'are you a robot',
  ];
  const matchedTextMarkers = textMarkers.filter((marker) => lowerHtml.includes(marker));

  // Booking's challenge shell has a very characteristic shape: tiny body,
  // empty <title>, a 202 status, and a `getAjaxObject` polyfill that sets
  // up an XHR to complete a handshake before serving the real page.
  const matchedStructuralMarkers: string[] = [];
  if (html.includes('getAjaxObject') && html.includes('XMLHttpRequest')) {
    matchedStructuralMarkers.push('booking-challenge-shell');
  }
  if (status === 202) {
    matchedStructuralMarkers.push('soft-block-202');
  }
  if (docTitle === '' && html.length < 20_000) {
    matchedStructuralMarkers.push('empty-title-tiny-body');
  }

  const likelyBotWall =
    matchedTextMarkers.length > 0 ||
    matchedStructuralMarkers.includes('booking-challenge-shell') ||
    matchedStructuralMarkers.length >= 2;

  return { likelyBotWall, matchedTextMarkers, matchedStructuralMarkers };
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
  fingerprint: BotWallFingerprintResult;
  docTitle: string | null;
}): void {
  const { inputUrl, response, html, fingerprint, docTitle } = context;

  console.error('[listing-import] empty extraction diagnostic', {
    inputUrl,
    status: response.status,
    finalUrl: response.url,
    contentType: response.headers.get('content-type'),
    contentLength: html.length,
    docTitle,
    likelyBotWall: fingerprint.likelyBotWall,
    matchedTextMarkers: fingerprint.matchedTextMarkers,
    matchedStructuralMarkers: fingerprint.matchedStructuralMarkers,
    htmlPreview: html.slice(0, 1200),
  });
}

function buildEmptyExtractionErrorMessage(args: {
  hostname: string;
  likelyBotWall: boolean;
}): string {
  const { hostname, likelyBotWall } = args;
  const preamble = likelyBotWall
    ? `${hostname} blocked our server from loading the page (bot detection).`
    : `Couldn't extract any listing data from ${hostname}.`;
  return (
    `${preamble} Try the House Vote browser extension on the page in your logged-in ` +
    `browser — it captures the rendered DOM directly. See the dev server terminal for the raw response preview.`
  );
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
    const docTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
    const fingerprint = fingerprintBotWall({
      status: response.status,
      html,
      docTitle,
    });

    logEmptyExtractionDiagnostics({ inputUrl, response, html, fingerprint, docTitle });

    const hostname = (() => {
      try {
        return new URL(inputUrl).hostname;
      } catch {
        return 'the source site';
      }
    })();

    throw new Error(
      buildEmptyExtractionErrorMessage({
        hostname,
        likelyBotWall: fingerprint.likelyBotWall,
      }),
    );
  }

  return normalizeImportedListing(capture, 'URL_FETCH');
}
