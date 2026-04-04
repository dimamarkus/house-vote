import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function MetadataItem({
  className,
  icon,
  label,
  value,
}: {
  className?: string;
  icon?: ReactNode;
  label?: ReactNode;
  value?: ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon}
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      {value ? <span>{value}</span> : null}
    </div>
  );
}
