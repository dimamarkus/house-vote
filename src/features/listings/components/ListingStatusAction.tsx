"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ListingStatus } from "db";
import { Button } from "@turbodima/ui/shadcn/button";
import { toast } from "sonner";
import { Ban, Check } from "lucide-react";
import { updateListingStatus } from "../actions/updateListingStatus";

interface ListingStatusActionProps {
  listingId: string;
  currentStatus: ListingStatus;
  size?: "sm" | "md" | "lg";
  onStatusUpdate?: (newStatus: ListingStatus) => void;
}

// Submit button with loading state
function SubmitButton({
  isRejected,
  size = "md"
}: {
  isRejected: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();

  // Determine size classes
  const sizeClasses = {
    sm: "h-8 px-2 text-xs",
    md: "h-9 px-3",
    lg: "h-10 px-4",
  };

  // Determine icon size
  const iconSize = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <Button
      type="submit"
      variant="destructive"
      weight={isRejected ? "hollow" : "solid"}
      size={size === "lg" ? "default" : "sm"}
      className={sizeClasses[size]}
      disabled={pending}
    >
      {isRejected ? (
        <>
          <Check size={iconSize[size]} className="mr-1" />
          {size !== "sm" && "Unreject"}
        </>
      ) : (
        <>
          <Ban size={iconSize[size]} className="mr-1" />
          {size !== "sm" && "Reject"}
        </>
      )}
    </Button>
  );
}

export function ListingStatusAction({
  listingId,
  currentStatus,
  size = "md",
  onStatusUpdate,
}: ListingStatusActionProps) {
  const [status, setStatus] = useState(currentStatus);
  const isRejected = status === ListingStatus.REJECTED;

  // New status will be the opposite of current status
  const newStatus = isRejected
    ? ListingStatus.POTENTIAL
    : ListingStatus.REJECTED;

  const handleAction = async (formData: FormData) => {
    try {
      const result = await updateListingStatus(formData);

      if (!result.success) {
        // For error responses, access the error message safely
        toast.error("Failed to update listing status");
        return;
      }

      // Update local state
      setStatus(newStatus);

      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate(newStatus);
      }

      // Show success message
      toast.success(
        isRejected
          ? "Listing has been unrejected"
          : "Listing has been rejected"
      );
    } catch {
      toast.error("An error occurred while updating status");
    }
  };

  return (
    <form action={handleAction} className="inline-flex">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="status" value={newStatus} />
      <SubmitButton isRejected={isRejected} size={size} />
    </form>
  );
}