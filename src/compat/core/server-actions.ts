import { ErrorCode } from "./errors";
import { createErrorResponse, createSuccessResponse } from "./responses";
import type { ArrayApiResponse, RelationOperations } from "./types";

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
