"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { DialogPortal, DialogOverlay, DialogClose } from "@/ui/shadcn/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "../utils/cn";

interface PhotoLightboxDialogProps {
  photos: string[];
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startIndex?: number;
}

export function PhotoLightboxDialog({
  photos,
  alt = "Photo",
  open,
  onOpenChange,
  startIndex = 0,
}: PhotoLightboxDialogProps) {
  const [index, setIndex] = useState(startIndex);
  const count = photos.length;
  const hasMultiple = count > 1;

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (!open || !hasMultiple) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hasMultiple, goPrev, goNext]);

  if (!open || count === 0) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-4 z-50 flex flex-col items-center justify-center outline-none",
            "sm:inset-8 md:inset-12",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt} — photo {index + 1} of {count}
          </DialogPrimitive.Title>

          <DialogClose className="absolute right-0 top-0 z-10 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          <div className="relative flex h-full w-full items-center justify-center">
            <Image
              src={photos[index]}
              alt={`${alt} ${index + 1} of ${count}`}
              fill
              className="object-contain"
              unoptimized
              sizes="90vw"
            />
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-2"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-2"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white backdrop-blur">
                {index + 1} / {count}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

interface PhotoLightboxProps {
  photos: string[];
  alt?: string;
  initialIndex?: number;
  children: React.ReactNode;
}

export function PhotoLightbox({
  photos,
  alt = "Photo",
  initialIndex = 0,
  children,
}: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);
  const count = photos.length;

  if (count === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        className="contents"
        onClick={() => setOpen(true)}
        aria-label={`View ${count} photo${count === 1 ? "" : "s"}`}
      >
        {children}
      </button>
      <PhotoLightboxDialog
        photos={photos}
        alt={alt}
        open={open}
        onOpenChange={setOpen}
        startIndex={initialIndex}
      />
    </>
  );
}
