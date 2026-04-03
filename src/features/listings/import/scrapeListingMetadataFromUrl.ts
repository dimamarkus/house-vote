import * as cheerio from 'cheerio';
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
  const $ = cheerio.load(html);
  const pageTitle = $('meta[property="og:title"]').attr('content')?.trim() || $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() ?? null;
  const ogImageUrl = $('meta[property="og:image"]').attr('content')?.trim() ?? null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() ?? inputUrl;

  return normalizeImportedListing(
    {
      url: canonicalUrl,
      title: pageTitle || null,
      address: pageTitle || null,
      notes: metaDescription,
      imageUrl: ogImageUrl,
      photoUrls: ogImageUrl ? [ogImageUrl] : [],
      rawPayload: {
        pageTitle,
        metaDescription,
        ogImageUrl,
        canonicalUrl,
      },
    },
    'URL_FETCH',
  );
}
