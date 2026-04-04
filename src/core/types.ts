import type { ErrorCodeType } from "./errors";

export const TYPES_VERSION = "1.0.0";

export interface PrismaActionOptions<TIncludes = unknown> {
  tx?: unknown;
  debug?: boolean;
  include?: TIncludes;
}

export type ConnectOperation<TId = string> = {
  connect?: TId[];
  disconnect?: TId[];
  set?: TId[];
};

export type RelationOperations<
  TRelations extends Record<string, string> = Record<string, string>,
> = {
  [K in keyof TRelations]?: ConnectOperation<TRelations[K]>;
};

export interface PrismaActionOptionsWithRelations<
  TIncludes = unknown,
  TRelations extends Record<string, string> = Record<string, string>,
> extends PrismaActionOptions<TIncludes> {
  relations?: RelationOperations<TRelations>;
}

export type ModelAggregations<TAggregations> = {
  _count?: TAggregations;
  _sum?: TAggregations;
  _avg?: TAggregations;
  _min?: TAggregations;
  _max?: TAggregations;
};

export type PaginationParams = {
  page: number;
  limit: number;
  skip?: number;
};

export type PaginationMeta = {
  page: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginationMetadata = PaginationParams & PaginationMeta;

export type SortOrder = "asc" | "desc";

export interface SortParams<TSortBy extends string = "createdAt"> {
  sortBy?: TSortBy;
  sortOrder?: SortOrder;
}

export type SearchParams<TSortBy extends string = "createdAt"> = PaginationParams &
  SortParams<TSortBy> & {
    query?: string;
  };

export type ResponseMeta = Record<string, unknown>;

export type BaseResponse = {
  success: boolean;
  meta?: ResponseMeta;
};

export type BasicSuccessResponse<TData> = BaseResponse & {
  success: true;
  data: TData;
};

export type PaginatedSuccessResponse<TData> = BaseResponse & {
  success: true;
  data: TData[];
  pagination: PaginationMetadata;
};

export type ErrorResponseData = string | Record<string, string[]>;

export type ErrorResponse = Omit<BaseResponse, "success"> & {
  success?: false;
  error: ErrorResponseData;
  code?: ErrorCodeType;
  fieldErrors?: Record<string, string[]>;
};

export type BasicApiResponse<TData> = BasicSuccessResponse<TData> | ErrorResponse;

export type PaginatedApiResponse<TData> =
  | PaginatedSuccessResponse<TData>
  | ErrorResponse;

export type ApiResponse<TData> = BasicApiResponse<TData> | PaginatedApiResponse<TData>;

export type ArrayApiResponse<TData> =
  | BasicSuccessResponse<TData[]>
  | PaginatedSuccessResponse<TData>
  | ErrorResponse;
