"use client";

import { Skeleton } from "@heroui/react";

export function CommentSkeleton() {
  return (
    <div className="flex items-start gap-2 py-2">
      <Skeleton className="skeleton-bone rounded-full w-7 h-7 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="skeleton-bone h-3 w-24 rounded-lg" />
        <Skeleton className="skeleton-bone h-3 w-full rounded-lg" />
        <Skeleton className="skeleton-bone h-2.5 w-12 rounded-lg" />
      </div>
    </div>
  );
}

export function CommentSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </div>
  );
}
