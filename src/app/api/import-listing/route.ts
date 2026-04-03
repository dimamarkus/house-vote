import { NextRequest, NextResponse } from 'next/server';
import { ListingImportRequestSchema } from '@/features/listings/import/schemas';
import { normalizeImportedListing } from '@/features/listings/import/normalizeImportedListing';
import { upsertImportedListing } from '@/features/listings/import/upsertImportedListing';
import { trips } from '@/features/trips/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = (await request.json()) as unknown;
    const validationResult = ListingImportRequestSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error.issues.map((issue) => issue.message).join(', '),
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const { tripId, importToken, capture } = validationResult.data;
    const importTokenResult = await trips.validateImportToken(tripId, importToken);

    if (!importTokenResult.success) {
      return NextResponse.json(importTokenResult, {
        status: 403,
        headers: corsHeaders,
      });
    }

    const normalizedListing = normalizeImportedListing(capture, 'EXTENSION');
    const savedListing = await upsertImportedListing(tripId, normalizedListing);

    return NextResponse.json(
      {
        success: true,
        data: {
          listingId: savedListing.id,
          source: normalizedListing.source,
          importStatus: normalizedListing.importStatus,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected import error.',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
