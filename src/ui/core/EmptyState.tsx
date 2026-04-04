import { Calendar, Home } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";

const iconMap = {
  Calendar,
  Home,
} as const;

export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: keyof typeof iconMap | ReactNode;
  title: ReactNode;
}) {
  const Icon =
    typeof icon === "string"
      ? iconMap[icon as keyof typeof iconMap]
      : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="mb-4 h-10 w-10 text-muted-foreground" /> : icon}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
