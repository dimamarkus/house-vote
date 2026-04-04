import { ErrorCode } from "./errors";
import type {
  BasicApiResponse,
  BasicSuccessResponse,
  ErrorResponse,
  PaginationParams,
  PaginatedSuccessResponse,
  ResponseMeta,
} from "./types";

type SuccessResponseParams<TData> = Pick<BasicSuccessResponse<TData>, "data"> & {
  meta?: ResponseMeta;
};

function calculatePagination({
  page,
  limit,
  totalItems,
}: Omit<PaginationParams, "skip"> & { totalItems: number }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: currentPage,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    limit,
  };
}

export function createSuccessResponse<TData>(
  params: SuccessResponseParams<TData>,
): BasicSuccessResponse<TData>;
export function createSuccessResponse<TItem>(
  params: SuccessResponseParams<TItem[]> & {
    pagination: Omit<PaginationParams, "skip"> & {
      totalItems: number;
    };
  },
): PaginatedSuccessResponse<TItem>;
export function createSuccessResponse<TData>(
  params: SuccessResponseParams<TData> & {
    pagination?: Omit<PaginationParams, "skip"> & {
      totalItems: number;
    };
  },
): BasicSuccessResponse<TData> | PaginatedSuccessResponse<TData> {
  const { data, meta, pagination } = params;

  if (pagination) {
    return {
      success: true,
      data: Array.isArray(data) ? data : [data],
      pagination: calculatePagination(pagination),
      ...(meta ? { meta } : {}),
    };
  }

  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

type ErrorResponseParams = Omit<ErrorResponse, "error"> & {
  error: unknown;
  prefix?: string;
  shouldLog?: boolean;
};

export function createErrorResponse({
  error,
  code = ErrorCode.UNKNOWN_ERROR,
  fieldErrors,
  prefix,
  shouldLog = true,
}: ErrorResponseParams): ErrorResponse {
  if (shouldLog) {
    console.error(prefix ? `${prefix} ${String(error)}` : error);
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    code,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export async function handleDbOperation<TResult>(
  operation: () => Promise<TResult>,
  errorPrefix: string,
  customErrorCode: (typeof ErrorCode)[keyof typeof ErrorCode] = ErrorCode.DATABASE_ERROR,
): Promise<BasicApiResponse<TResult>> {
  try {
    const result = await operation();
    return createSuccessResponse({ data: result });
  } catch (error) {
    return createErrorResponse({
      error,
      code: customErrorCode,
      prefix: errorPrefix,
    });
  }
}
