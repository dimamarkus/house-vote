"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "../utils/cn";

type ImageWithFallbackProps = {
  alt: string;
  className?: string;
  fallbackClassName?: string;
  FallbackIcon?: LucideIcon;
  height: number;
  src?: string | null;
  width: number;
};

export function ImageWithFallback({
  alt,
  className,
  fallbackClassName,
  FallbackIcon,
  height,
  src,
  width,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName,
        )}
      >
        {FallbackIcon ? <FallbackIcon className="h-6 w-6" /> : null}
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      onError={() => setHasError(true)}
      src={src}
      unoptimized
      width={width}
    />
  );
}
