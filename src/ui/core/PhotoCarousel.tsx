"use client";

import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import { PhotoLightboxDialog } from "./PhotoLightbox";
import { cn } from "../utils/cn";

interface PhotoCarouselProps {
  photos: string[];
  alt?: string;
  className?: string;
  /** Content rendered over the top-left corner (e.g. status badges). */
  overlayTopLeft?: React.ReactNode;
  /** Content rendered over the top-right corner (e.g. photo count). */
  overlayTopRight?: React.ReactNode;
}

export function PhotoCarousel({
  photos,
  alt = "Photo",
  className,
  overlayTopLeft,
  overlayTopRight,
}: PhotoCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const count = photos.length;
  const hasMultiple = count > 1;
  const canScrollPrev = hasMultiple;
  const canScrollNext = hasMultiple;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaApi?.scrollPrev();
    },
    [emblaApi],
  );

  const scrollNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaApi?.scrollNext();
    },
    [emblaApi],
  );

  if (count === 0) {
    return (
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-t-lg bg-muted flex items-center justify-center",
          className,
        )}
      >
        <ImageIcon className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className={cn("group relative aspect-video overflow-hidden rounded-t-lg bg-muted", className)}>
        <div ref={emblaRef} className="h-full overflow-hidden">
          <div className="flex h-full">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                className="relative h-full min-w-0 flex-[0_0_100%] cursor-pointer"
                onClick={() => {
                  setLightboxOpen(true);
                }}
                aria-label={`View photo ${i + 1} of ${count} fullscreen`}
              >
                <ImageWithFallback
                  src={src}
                  alt={`${alt} ${i + 1}`}
                  width={600}
                  height={338}
                  className="object-cover w-full h-full"
                  FallbackIcon={ImageIcon}
                  fallbackClassName="h-full w-full"
                />
              </button>
            ))}
          </div>
        </div>

        {hasMultiple && canScrollPrev && (
          <button
            type="button"
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-800 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {hasMultiple && canScrollNext && (
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-gray-800 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "block h-1.5 w-1.5 rounded-full transition-colors",
                  i === selectedIndex
                    ? "bg-white"
                    : "bg-white/50",
                )}
              />
            ))}
          </div>
        )}

        {overlayTopLeft && (
          <div className="absolute left-3 top-3 z-10">{overlayTopLeft}</div>
        )}
        {overlayTopRight && (
          <div className="absolute right-3 top-3 z-10">{overlayTopRight}</div>
        )}
      </div>

      <PhotoLightboxDialog
        photos={photos}
        alt={alt}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        startIndex={selectedIndex}
      />
    </>
  );
}
