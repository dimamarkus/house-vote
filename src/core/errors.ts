export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
  FOREIGN_KEY_VIOLATION: "FOREIGN_KEY_VIOLATION",
  UNIQUE_VIOLATION: "UNIQUE_VIOLATION",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  REQUIRED_FIELD: "REQUIRED_FIELD",
  NETWORK_ERROR: "NETWORK_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  IMPLEMENTATION_ERROR: "IMPLEMENTATION_ERROR",
  SUBMISSION_ERROR: "SUBMISSION_ERROR",
  SCRAPING_ERROR: "SCRAPING_ERROR",
  COMPARISON_ERROR: "COMPARISON_ERROR",
  CRON_JOB_ERROR: "CRON_JOB_ERROR",
  PROCESSING_ERROR: "PROCESSING_ERROR",
  INACTIVE_SOURCE: "INACTIVE_SOURCE",
  NO_ACTIVE_SOURCES: "NO_ACTIVE_SOURCES",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export function errorToString(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return String(error);
}

/**
 * Convert a downstream `ErrorResponse.error` payload (which is `string |
 * Record<string, string[]>`) into a plain string message suitable for
 * re-throwing, logging, or showing to the user. Field-error maps are
 * flattened into `"field1: msg; field2: msg"` form so nothing gets silently
 * dropped.
 */
export function errorResponseDataToString(
  error: string | Record<string, string[]>,
  fallback: string,
): string {
  if (typeof error === "string") {
    return error.length > 0 ? error : fallback;
  }

  const parts: string[] = [];
  for (const [field, messages] of Object.entries(error)) {
    if (messages.length > 0) {
      parts.push(`${field}: ${messages.join(", ")}`);
    }
  }

  return parts.length > 0 ? parts.join("; ") : fallback;
}
