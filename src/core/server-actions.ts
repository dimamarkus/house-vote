import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId, UnauthenticatedError } from "@/core/auth/server/requireUserId";
import { ErrorCode } from "./errors";
import { createErrorResponse, createSuccessResponse } from "./responses";
import type { ArrayApiResponse, BasicApiResponse, RelationOperations } from "./types";

/**
 * Result shape a `createServerAction` handler must return: the data to send
 * back to the client, plus an optional list of paths the wrapper should
 * `revalidatePath()` after a successful run.
 *
 * Modeling revalidation as a return value (instead of letting each handler
 * call `revalidatePath` itself) means the wrapper enforces it uniformly and
 * a future audit/tracing hook only has to live in one place.
 */
export interface ServerActionResult<TData> {
  data: TData;
  revalidate?: readonly string[];
}

export interface AuthenticatedActionContext<TInput> {
  input: TInput;
  userId: string;
}

export interface UnauthenticatedActionContext<TInput> {
  input: TInput;
}

interface BaseServerActionArgs<TInput> {
  /** Raw input from the action caller; validated against `schema`. */
  input: unknown;
  schema: z.ZodType<TInput>;
  /**
   * Prefix attached to the error message when the handler throws a
   * non-auth error. A function form lets callers vary wording based on
   * parsed input (e.g. "Failed to add pro:" vs "Failed to add comment:").
   */
  errorPrefix: string | ((input: TInput) => string);
  /**
   * Fallback for the rare case where schema parsing fails without emitting
   * an issue message. Defaults to a generic "Invalid request." so callers
   * don't have to supply one.
   */
  validationErrorMessage?: string;
}

interface AuthenticatedActionArgs<TInput, TData> extends BaseServerActionArgs<TInput> {
  requireAuth: true;
  handler: (ctx: AuthenticatedActionContext<TInput>) => Promise<ServerActionResult<TData>>;
}

interface UnauthenticatedActionArgs<TInput, TData> extends BaseServerActionArgs<TInput> {
  requireAuth: false;
  handler: (ctx: UnauthenticatedActionContext<TInput>) => Promise<ServerActionResult<TData>>;
}

/**
 * Shared skeleton for server actions that follow the symmetric
 * parse → (optionally auth) → handle → revalidate → respond pipeline.
 *
 * The wrapper lives in a regular (non-`'use server'`) module on purpose:
 * it is called FROM server actions, not exposed AS one. Actions import it
 * and call it from inside their exported `'use server'` function.
 *
 * Auth contract:
 *   - `requireAuth: true`  → the handler receives `{ input, userId }`. An
 *     `UnauthenticatedError` is caught here and turned into an
 *     `UNAUTHENTICATED`-coded error response.
 *   - `requireAuth: false` → the handler receives `{ input }` only and is
 *     responsible for any per-action authorization (typically via a share
 *     token, API key, or similar).
 */
export async function createServerAction<TInput, TData>(
  args: AuthenticatedActionArgs<TInput, TData> | UnauthenticatedActionArgs<TInput, TData>,
): Promise<BasicApiResponse<TData>> {
  const validation = args.schema.safeParse(args.input);

  if (!validation.success) {
    return createErrorResponse({
      error: validation.error.issues[0]?.message ?? args.validationErrorMessage ?? "Invalid request.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const input = validation.data;

  try {
    const result: ServerActionResult<TData> = args.requireAuth
      ? await args.handler({ input, userId: await requireUserId() })
      : await args.handler({ input });

    for (const path of result.revalidate ?? []) {
      revalidatePath(path);
    }

    return createSuccessResponse({ data: result.data });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return createErrorResponse({
        error: error.message,
        code: ErrorCode.UNAUTHENTICATED,
        shouldLog: false,
      });
    }

    const prefix = typeof args.errorPrefix === "function" ? args.errorPrefix(input) : args.errorPrefix;
    return createErrorResponse({
      error,
      code: ErrorCode.PROCESSING_ERROR,
      prefix,
    });
  }
}

export interface GetEntityOptions<TModel, TInclude> {
  page?: number;
  limit?: number;
  query?: string;
  searchFields?: (keyof TModel & string)[];
  sortBy?: keyof TModel & string;
  sortOrder?: "asc" | "desc";
  include?: TInclude;
  where?: Record<string, unknown>;
  entityName?: string;
  orderByMappings?: Record<string, Record<string, unknown>>;
}

export function processRelationOperations<
  TRelations extends Record<string, string>,
>(relations?: RelationOperations<TRelations>): Record<string, unknown> {
  if (!relations) {
    return {};
  }

  const updateData: Record<string, unknown> = {};

  for (const [relationName, operations] of Object.entries(relations)) {
    if (!operations) {
      continue;
    }

    if (operations.set) {
      updateData[relationName] = {
        set: operations.set.map((id: string) => ({ id })),
      };
      continue;
    }

    const relationUpdate: Record<string, unknown> = {};

    if (operations.connect?.length) {
      relationUpdate.connect = operations.connect.map((id: string) => ({ id }));
    }

    if (operations.disconnect?.length) {
      relationUpdate.disconnect = operations.disconnect.map((id: string) => ({ id }));
    }

    if (Object.keys(relationUpdate).length > 0) {
      updateData[relationName] = relationUpdate;
    }
  }

  return updateData;
}

export async function getEntities<
  TModel extends Record<string, unknown>,
  TInclude,
>(
  delegate: {
    findMany: (args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string> | Record<string, unknown> | Array<Record<string, unknown>>;
      skip?: number;
      take?: number;
      include?: Record<string, unknown>;
    }) => Promise<TModel[]>;
    count: (args: { where?: Record<string, unknown> }) => Promise<number>;
  },
  options?: GetEntityOptions<TModel, TInclude>,
): Promise<ArrayApiResponse<TModel>> {
  const {
    page,
    limit,
    query = "",
    searchFields = ["name" as keyof TModel & string],
    sortBy = "name" as keyof TModel & string,
    sortOrder = "asc",
    include,
    where: additionalWhere = {},
    entityName = "entity",
    orderByMappings = {},
  } = options ?? {};

  try {
    const searchWhere = query
      ? {
          OR: searchFields.map((field) => ({
            [field]: { contains: query, mode: "insensitive" as const },
          })),
        }
      : {};

    const where = {
      ...searchWhere,
      ...additionalWhere,
    };

    const orderBy =
      sortBy in orderByMappings
        ? (orderByMappings[sortBy] ?? { [sortBy]: sortOrder })
        : { [sortBy]: sortOrder };

    const shouldPaginate = Boolean(page) || Boolean(limit);

    if (shouldPaginate) {
      const pageNum = page ?? 1;
      const limitNum = limit ?? 10;
      const skip = (pageNum - 1) * limitNum;

      const [entities, totalCount] = await Promise.all([
        delegate.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          ...(include ? { include: include as Record<string, unknown> } : {}),
        }),
        delegate.count({ where }),
      ]);

      return createSuccessResponse({
        data: entities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalItems: totalCount,
        },
      });
    }

    const entities = await delegate.findMany({
      where,
      orderBy,
      ...(include ? { include: include as Record<string, unknown> } : {}),
    });

    return createSuccessResponse({
      data: entities,
    });
  } catch (error) {
    return createErrorResponse({
      error,
      code: ErrorCode.DATABASE_ERROR,
      prefix: `Failed to fetch ${entityName}s:`,
    });
  }
}
