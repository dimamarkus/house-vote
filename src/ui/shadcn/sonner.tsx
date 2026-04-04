"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster({
  className,
}: {
  className?: string;
}) {
  return <SonnerToaster className={className} theme="system" />;
}
