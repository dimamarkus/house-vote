import * as React from "react";
import { cn } from "../utils/cn";

export type BadgeVariant = "default" | "primary" | "secondary" | "destructive";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  weight?: "solid" | "hollow";
}

function getBadgeClasses(variant: BadgeVariant, weight: "solid" | "hollow") {
  if (weight === "hollow") {
    return "border border-input bg-background text-foreground";
  }

  if (variant === "secondary") {
    return "bg-secondary text-secondary-foreground";
  }

  if (variant === "destructive") {
    return "bg-destructive text-destructive-foreground";
  }

  return "bg-primary text-primary-foreground";
}

export function Badge({
  className,
  variant = "default",
  weight = "solid",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        getBadgeClasses(variant, weight),
        className,
      )}
      {...props}
    />
  );
}
