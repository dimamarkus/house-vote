"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../utils/cn";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-[sheet-overlay-in_200ms_ease-out] data-[state=closed]:animate-[sheet-overlay-out_150ms_ease-in]",
      className,
    )}
    ref={ref}
    {...props}
  />
));

SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

function getSideClasses(side: "top" | "right" | "bottom" | "left") {
  if (side === "left") {
    return "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm";
  }

  if (side === "top") {
    return "inset-x-0 top-0 border-b";
  }

  if (side === "bottom") {
    return "inset-x-0 bottom-0 border-t";
  }

  return "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm";
}

function getSideAnimationClasses(side: "top" | "right" | "bottom" | "left") {
  if (side === "left") {
    return "data-[state=open]:animate-[sheet-in-left_220ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[sheet-out-left_180ms_ease-in]";
  }

  if (side === "top") {
    return "data-[state=open]:animate-[sheet-in-top_220ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[sheet-out-top_180ms_ease-in]";
  }

  if (side === "bottom") {
    return "data-[state=open]:animate-[sheet-in-bottom_220ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[sheet-out-bottom_180ms_ease-in]";
  }

  return "data-[state=open]:animate-[sheet-in-right_220ms_cubic-bezier(0.16,1,0.3,1)] data-[state=closed]:animate-[sheet-out-right_180ms_ease-in]";
}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "top" | "right" | "bottom" | "left";
    showCloseButton?: boolean;
    closeButtonLabel?: string;
  }
>(
  (
    {
      className,
      children,
      side = "right",
      showCloseButton = true,
      closeButtonLabel = "Close sheet",
      ...props
    },
    ref,
  ) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 gap-4 bg-background p-6 shadow-lg will-change-transform",
        getSideClasses(side),
        getSideAnimationClasses(side),
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{closeButtonLabel}</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </SheetPortal>
  ),
);

SheetContent.displayName = DialogPrimitive.Content.displayName;

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));

SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));

SheetDescription.displayName = DialogPrimitive.Description.displayName;
