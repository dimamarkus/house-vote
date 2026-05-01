import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCode } from '@/core/errors';
import { importListingCapture } from '@/features/listings/import/importListingCapture';
import { ExtensionListingImportRequestSchema } from '@/features/listings/import/schemas';
import { assertTripMemberId } from '@/features/trips/guards';

function errorJson(error: string, status: number, code: string) {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return errorJson(
      'You must be signed in to import listings from the extension.',
      401,
      ErrorCode.UNAUTHENTICATED,
    );
  }

  const requestBody = (await request.json()) as unknown;
  const validationResult = ExtensionListingImportRequestSchema.safeParse(requestBody);

  if (!validationResult.success) {
    return errorJson(
      validationResult.error.issues.map((issue) => issue.message).join(', '),
      400,
      ErrorCode.VALIDATION_ERROR,
    );
  }

  const { tripId, capture } = validationResult.data;

  try {
    await assertTripMemberId(tripId, userId, 'import listings');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'You do not have access to this trip.';
    return errorJson(message, message === 'Trip not found.' ? 404 : 403, ErrorCode.FORBIDDEN);
  }

  try {
    const importResult = await importListingCapture({
      tripId,
      capture,
      importMethod: 'EXTENSION',
      addedById: userId,
    });

    revalidatePath(`/trips/${tripId}`);

    return NextResponse.json({
      success: true,
      data: importResult,
    });
  } catch (error) {
    return errorJson(
      error instanceof Error ? error.message : 'Unexpected import error.',
      500,
      ErrorCode.PROCESSING_ERROR,
    );
  }
}
