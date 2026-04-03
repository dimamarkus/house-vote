import type { ReadonlyURLSearchParams } from "next/navigation";
import type { SortOrder } from "./types";

type PageSearchParams = { [key: string]: string | string[] | undefined };

export interface StandardSearchParams<TSortBy extends string = string> {
  query?: string;
  page: number;
  limit: number;
  sortBy?: TSortBy;
  sortOrder: SortOrder;
}

export interface SearchParamOptions<TSortBy extends string = string> {
  defaultSortBy?: TSortBy;
  defaultSortOrder?: SortOrder;
  defaultLimit?: number;
  processCustomParams?: (
    rawParams: Record<string, string | undefined>,
  ) => Record<string, unknown>;
}

export async function processSearchParams<
  TSortBy extends string = string,
  TCustomParams extends Record<string, unknown> = Record<string, unknown>,
  TInput extends object = PageSearchParams,
>(
  searchParamsInput:
    | Promise<TInput>
    | ReadonlyURLSearchParams
    | TInput,
  options: SearchParamOptions<TSortBy> = {},
): Promise<StandardSearchParams<TSortBy> & TCustomParams> {
  const defaultSortOrder = options.defaultSortOrder ?? "asc";
  const defaultLimit = options.defaultLimit ?? 10;
  const resolvedInput =
    searchParamsInput instanceof Promise ? await searchParamsInput : searchParamsInput;
  const rawParams: Record<string, string | undefined> = {};

  if (typeof (resolvedInput as ReadonlyURLSearchParams).forEach === "function") {
    (resolvedInput as ReadonlyURLSearchParams).forEach((value, key) => {
      rawParams[key] = value;
    });
  } else {
    Object.entries(resolvedInput).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        rawParams[key] = value[0];
        return;
      }

      if (typeof value === "number") {
        rawParams[key] = String(value);
        return;
      }

      rawParams[key] = value;
    });
  }

  const standardParams: StandardSearchParams<TSortBy> = {
    query: rawParams.query,
    page: getNumberParam(rawParams.page, 1) ?? 1,
    limit: getNumberParam(rawParams.limit, defaultLimit) ?? defaultLimit,
    sortBy:
      typeof rawParams.sortBy === "string"
        ? (rawParams.sortBy as TSortBy)
        : options.defaultSortBy,
    sortOrder:
      rawParams.sortOrder === "asc" || rawParams.sortOrder === "desc"
        ? rawParams.sortOrder
        : defaultSortOrder,
  };

  const customParams = options.processCustomParams
    ? (options.processCustomParams(rawParams) as TCustomParams)
    : ({} as TCustomParams);

  return {
    ...standardParams,
    ...customParams,
  };
}

export function getNumberParam(
  value: string | string[] | undefined,
  defaultValue?: number,
): number | undefined {
  if (Array.isArray(value)) {
    return getNumberParam(value[0], defaultValue);
  }

  if (typeof value !== "string" || value.length === 0) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}
