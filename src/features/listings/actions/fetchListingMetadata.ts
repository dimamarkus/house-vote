"use server";

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import * as cheerio from 'cheerio';

// Define the input schema for the action
const inputSchema = z.object({
  url: z.string().url({ message: "Invalid URL provided." })
});

// Define a potential structure for the returned metadata
// Keep it simple initially, expand as needed
interface ListingMetadata {
  address?: string | null;
  price?: number | null;
  notes?: string | null;
  imageUrl?: string | null;
  // Add counts if scraping attempts them
  // bedroomCount?: number | null;
  // bedCount?: number | null;
  // bathroomCount?: number | null;
}

// Standard Server Action definition
export async function fetchListingMetadata(
  input: unknown // Input is unknown initially
): Promise<{ data?: ListingMetadata | null; error?: string | null }> {

  // 1. Validate Input
  const validationResult = inputSchema.safeParse(input);

  if (!validationResult.success) {
    // Concatenate errors if multiple fields fail (though only url here)
    const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
    return { error: errorMessage || "Invalid input." };
  }

  // Input is now validated
  const { url } = validationResult.data;

  // 2. Check Authentication
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return { error: "Authentication required." };
  }

  console.log(`Attempting to fetch metadata for URL: ${url} by user ${userId}`);

  try {
    // 1. Attempt to fetch the HTML
    // Add headers to mimic a browser request slightly
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) {
      // Handle non-successful responses (e.g., 404, 403, 500)
      console.error(`Failed to fetch URL ${url}. Status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch URL: ${response.statusText} (Status ${response.status})`);
    }

    const html = await response.text();

    // 2. Parse HTML with Cheerio
    const $ = cheerio.load(html);

    // 3. Extract the title tag content
    const pageTitle = $('title').first().text().trim();

    // 4. Attempt to extract the og:image meta tag content
    const ogImageUrl = $('meta[property="og:image"]').attr('content');

    // Basic cleanup for typical Airbnb/Vrbo titles (optional)
    let address = pageTitle;
    if (address?.includes(' - Airbnb')) {
      const splitAddress = address.split(' - Airbnb')[0];
      if (typeof splitAddress === 'string') address = splitAddress;
    } else if (address?.includes(' | Vrbo')) {
      const splitAddress = address.split(' | Vrbo')[0];
      if (typeof splitAddress === 'string') address = splitAddress;
    }
    // Further cleanup might be needed (e.g., removing location info)

    if (!address) {
       console.warn(`Could not extract title from ${url}`);
       // Don't throw an error, just return no address
    }

    // Construct metadata with the extracted title and image URL
    const metadata: ListingMetadata = {
      address: address || null,
      imageUrl: ogImageUrl || null,
      price: null,
      notes: pageTitle ? `Fetched page title: "${pageTitle}"${ogImageUrl ? ' and image.' : '.'}` : `Could not fetch page title. ${ogImageUrl ? 'Fetched image.' : ''}`,
    };

    console.log(`Successfully parsed metadata for: ${url}. Image found: ${!!ogImageUrl}`);
    return { data: metadata };

  } catch (error) {
    console.error(`Error processing metadata for ${url}:`, error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not extract information from the provided URL.",
    };
  }
}