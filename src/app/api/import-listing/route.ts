import { NextRequest, NextResponse } from 'next/server';
import { ListingImportRequestSchema } from '@/features/listings/import/schemas';
import { importListingCapture } from '@/features/listings/import/importListingCapture';
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

    const importResult = await importListingCapture({
      tripId,
      capture,
      importMethod: 'EXTENSION',
      addedById: importTokenResult.data.ownerId,
    });

    return NextResponse.json(
      {
        success: true,
        data: importResult,
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
