"use client";

import { Skeleton } from "@heroui/react";

export function MemberSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2">
      <Skeleton className="skeleton-bone rounded-full w-10 h-10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="skeleton-bone h-3 w-28 rounded-lg" />
        <Skeleton className="skeleton-bone h-2.5 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function MemberSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <MemberSkeleton key={i} />
      ))}
    </div>
  );
}
