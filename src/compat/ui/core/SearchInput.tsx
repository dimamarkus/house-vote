"use client";

import { Search } from "lucide-react";
import { useId, type ComponentPropsWithoutRef } from "react";
import { cn } from "../utils/cn";
import { Input } from "../shadcn/input";

type SearchInputProps = ComponentPropsWithoutRef<typeof Input> & {
  iconPosition?: "left" | "right";
  label?: string;
  labelSrOnly?: boolean;
};

export function SearchInput({
  className,
  iconPosition = "left",
  id,
  label = "Search",
  labelSrOnly = true,
  ...props
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="relative">
      <label className={labelSrOnly ? "sr-only" : "mb-2 block text-sm font-medium"} htmlFor={inputId}>
        {label}
      </label>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
          iconPosition === "left" ? "left-3" : "right-3",
        )}
      />
      <Input
        className={cn(iconPosition === "left" ? "pl-9" : "pr-9", className)}
        id={inputId}
        {...props}
      />
    </div>
  );
}
