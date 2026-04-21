"use server";

import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import type { ListingImportSourceValue } from '../import/types';
import { scrapeListingMetadataFromUrl } from '../import/scrapeListingMetadataFromUrl';

// Define the input schema for the action
const inputSchema = z.object({
  url: z.string().url({ message: "Invalid URL provided." })
});

// Define a potential structure for the returned metadata
// Keep it simple initially, expand as needed
interface ListingMetadata {
  title?: string | null;
  address?: string | null;
  price?: number | null;
  bedroomCount?: number | null;
  bedCount?: number | null;
  bathroomCount?: number | null;
  sourceDescription?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  photoUrls?: string[];
  source?: ListingImportSourceValue;
  sourceExternalId?: string | null;
}

// Standard Server Action definition
export async function fetchListingMetadata(
  input: unknown // Input is unknown initially
): Promise<{ data?: ListingMetadata | null; error?: string | null }> {

  // 1. Validate Input
  const validationResult = inputSchema.safeParse(input);

  if (!validationResult.success) {
    // Concatenate errors if multiple fields fail (though only url here)
    const errorMessage = validationResult.error.issues
      .map((issue) => issue.message)
      .join(', ');
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

  try {
    const scrapedListing = await scrapeListingMetadataFromUrl(url);
    const metadata: ListingMetadata = {
      title: scrapedListing.title,
      address: scrapedListing.address,
      price: scrapedListing.price,
      bedroomCount: scrapedListing.bedroomCount,
      bedCount: scrapedListing.bedCount,
      bathroomCount: scrapedListing.bathroomCount,
      sourceDescription: scrapedListing.sourceDescription,
      notes: scrapedListing.notes,
      imageUrl: scrapedListing.imageUrl,
      photoUrls: scrapedListing.photoUrls,
      source: scrapedListing.source,
      sourceExternalId: scrapedListing.sourceExternalId,
    };

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