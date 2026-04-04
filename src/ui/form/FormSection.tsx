import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function FormSection({
  children,
  className,
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      {title ? <h3 className="text-base font-semibold">{title}</h3> : null}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
