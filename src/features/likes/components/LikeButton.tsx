"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "../actions/toggleLike";
import { Button } from "@turbodima/ui/shadcn/button";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

interface LikeButtonProps {
  listingId: string;
  initialLiked?: boolean;
  initialCount?: number;
  size?: "sm" | "md" | "lg";
}

export function LikeButton({
  listingId,
  initialLiked = false,
  initialCount = 0,
  size = "md",
}: LikeButtonProps) {
  const { userId } = useAuth() || {};
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleLike = async () => {
    if (!userId) {
      toast.error("You need to sign in to like listings");
      return;
    }

    setIsLoading(true);
    try {
      const result = await toggleLike(listingId);

      if (result.success) {
        // If previously liked, decrement count
        if (isLiked) {
          setLikeCount((prev) => Math.max(0, prev - 1));
        } else {
          // If not previously liked, increment count
          setLikeCount((prev) => prev + 1);
        }

        // Toggle liked state
        setIsLiked(!isLiked);
      } else {
        toast.error("Failed to toggle like");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 24,
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        weight="ghost"
        size="icon"
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${isLiked ? "text-red-500" : "text-gray-500"}`}
        onClick={handleToggleLike}
        disabled={isLoading}
        aria-label={isLiked ? "Unlike" : "Like"}
      >
        <Heart
          size={iconSizes[size]}
          className={isLiked ? "fill-red-500" : "fill-none"}
        />
      </Button>
      {likeCount > 0 && (
        <span className="text-xs font-medium text-gray-500">{likeCount}</span>
      )}
    </div>
  );
}