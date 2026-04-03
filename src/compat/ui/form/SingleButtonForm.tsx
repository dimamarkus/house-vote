"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../shadcn/button";

type ActionResult = {
  error?: unknown;
  success?: boolean;
};

export function SingleButtonForm({
  action,
  buttonIcon: ButtonIcon,
  buttonSize = "default",
  buttonVariant = "primary",
  buttonWeight = "solid",
  confirmLabel,
  description,
  errorMessage = "Action failed",
  successMessage = "Action completed",
  title,
}: {
  action: () => Promise<ActionResult>;
  buttonIcon?: LucideIcon;
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonVariant?: "primary" | "neutral" | "destructive";
  buttonWeight?: "solid" | "hollow" | "ghost" | "link";
  confirmLabel?: string;
  confirmVariant?: "primary" | "neutral" | "destructive";
  description?: string;
  errorMessage?: string;
  successMessage?: string;
  title?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Button
      disabled={isSubmitting}
      onClick={async () => {
        const confirmed = window.confirm(
          description ? `${title ?? "Confirm action"}\n\n${description}` : title ?? "Confirm action",
        );

        if (!confirmed) {
          return;
        }

        setIsSubmitting(true);

        try {
          const result = await action();

          if (result?.success === false) {
            toast.error(typeof result.error === "string" ? result.error : errorMessage);
            return;
          }

          toast.success(successMessage || confirmLabel || "Done");
        } catch {
          toast.error(errorMessage);
        } finally {
          setIsSubmitting(false);
        }
      }}
      size={buttonSize}
      title={title}
      variant={buttonVariant}
      weight={buttonWeight}
    >
      {ButtonIcon ? <ButtonIcon className="h-4 w-4" /> : null}
    </Button>
  );
}
