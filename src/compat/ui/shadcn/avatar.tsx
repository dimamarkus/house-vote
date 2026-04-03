import * as React from "react";
import Image from "next/image";
import { cn } from "../utils/cn";

export function Avatar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage({
  className,
  alt = "",
  src,
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  if (typeof src !== "string" || src.length === 0) {
    return null;
  }

  return (
    <Image
      alt={alt}
      className={cn("aspect-square h-full w-full object-cover", className)}
      fill
      sizes="40px"
      src={src}
      unoptimized
    />
  );
}

export function AvatarFallback({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  );
}
