"use client";

import { Skeleton } from "@heroui/react";

export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="skeleton-bone rounded-full w-11 h-11 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="skeleton-bone h-3.5 w-28 rounded-lg" />
        <Skeleton className="skeleton-bone h-3 w-40 rounded-lg" />
      </div>
      <Skeleton className="skeleton-bone h-2.5 w-10 rounded-lg" />
    </div>
  );
}

export function ConversationSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}
