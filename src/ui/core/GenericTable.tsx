"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { cn } from "../utils/cn";

export type ColumnDef<TItem> = {
  accessorKey?: keyof TItem & string;
  cell?: (item: TItem) => React.ReactNode;
  className?: string;
  header: React.ReactNode;
  sortable?: boolean;
};

type SortDirection = "asc" | "desc";

function compareValues(left: unknown, right: unknown, direction: SortDirection) {
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return direction === "asc"
      ? left.getTime() - right.getTime()
      : right.getTime() - left.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return direction === "asc" ? left - right : right - left;
  }

  const leftString = String(left).toLowerCase();
  const rightString = String(right).toLowerCase();

  return direction === "asc"
    ? leftString.localeCompare(rightString)
    : rightString.localeCompare(leftString);
}

export function GenericTable<TItem extends Record<string, unknown>>({
  columns,
  data,
  emptyStateProps,
  rowKeyField,
}: {
  basePath?: string;
  columns: Array<ColumnDef<TItem>>;
  data: TItem[];
  emptyStateProps?: {
    description?: React.ReactNode;
    icon?: React.ComponentProps<typeof EmptyState>["icon"];
    title: React.ReactNode;
  };
  rowKeyField: keyof TItem & string;
}) {
  const [sortConfig, setSortConfig] = React.useState<{
    direction: SortDirection;
    key: keyof TItem & string;
  } | null>(null);

  const sortedData = React.useMemo(() => {
    if (!sortConfig) {
      return data;
    }

    return [...data].sort((left, right) =>
      compareValues(left[sortConfig.key], right[sortConfig.key], sortConfig.direction),
    );
  }, [data, sortConfig]);

  if (data.length === 0 && emptyStateProps) {
    return <EmptyState {...emptyStateProps} />;
  }

  return (
    <div className="overflow-visible rounded-lg border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column, index) => {
                const isActiveSort =
                  sortConfig && column.accessorKey === sortConfig.key;
                const isSortable = Boolean(column.sortable && column.accessorKey);

                return (
                  <th
                    className={cn(
                      "px-4 py-3 text-left font-medium text-muted-foreground",
                      column.className,
                    )}
                    key={`${String(column.header)}-${index}`}
                  >
                    {isSortable ? (
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() =>
                          setSortConfig((current) => {
                            if (!column.accessorKey) {
                              return current;
                            }

                            if (!current || current.key !== column.accessorKey) {
                              return { direction: "asc", key: column.accessorKey };
                            }

                            return {
                              direction: current.direction === "asc" ? "desc" : "asc",
                              key: column.accessorKey,
                            };
                          })
                        }
                        type="button"
                      >
                        <span>{column.header}</span>
                        {isActiveSort ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {sortedData.map((item) => (
              <tr key={String(item[rowKeyField])}>
                {columns.map((column, index) => (
                  <td
                    className={cn("px-4 py-3 align-middle", column.className)}
                    key={`${String(item[rowKeyField])}-${index}`}
                  >
                    {column.cell
                      ? column.cell(item)
                      : column.accessorKey
                        ? String(item[column.accessorKey] ?? "")
                        : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
