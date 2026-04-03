import { z } from "zod";
import { ErrorCode } from "./errors";
import { createErrorResponse, createSuccessResponse } from "./responses";
import type { BasicApiResponse } from "./types";

export function validateActionInput<T extends z.ZodType>(
  input: FormData | object,
  schema: T,
): BasicApiResponse<z.infer<T>> {
  const values = input instanceof FormData ? Object.fromEntries(input.entries()) : input;
  const validationResult = schema.safeParse(values);

  if (!validationResult.success) {
    return createErrorResponse({
      error: validationResult.error,
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  return createSuccessResponse({
    data: validationResult.data as z.infer<T>,
  });
}
