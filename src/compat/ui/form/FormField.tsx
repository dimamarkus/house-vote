import type { ReactNode } from "react";
import { Label } from "../shadcn/label";
import { cn } from "../utils/cn";

export function FormField({
  children,
  className,
  error,
  helperText,
  label,
  name,
  required = false,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  helperText?: string;
  label: ReactNode;
  name: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
      {helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
