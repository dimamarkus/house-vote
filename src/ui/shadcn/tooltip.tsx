"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function TooltipTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  if (asChild) {
    return <Slot>{children}</Slot>;
  }

  return <span>{children}</span>;
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
