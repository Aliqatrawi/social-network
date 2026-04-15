"use client";

import { Skeleton } from "@heroui/react";

export function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl">
      <Skeleton className="skeleton-bone rounded-full w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="skeleton-bone h-3 w-4/5 rounded-lg" />
        <Skeleton className="skeleton-bone h-3 w-3/5 rounded-lg" />
        <Skeleton className="skeleton-bone h-2.5 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function NotificationSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}
