"use client";

import { LikeButton } from "./LikeButton";
import { Card, CardContent, CardHeader, CardTitle } from "@turbodima/ui/shadcn/card";

interface LikeDemoProps {
  listingId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

export function LikeDemo({
  listingId,
  initialLiked = false,
  initialCount = 0
}: LikeDemoProps) {
  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle>Like Feature Demo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Click the heart to like or unlike this listing
        </p>
        <LikeButton
          listingId={listingId}
          initialLiked={initialLiked}
          initialCount={initialCount}
          size="lg"
        />
      </CardContent>
    </Card>
  );
}