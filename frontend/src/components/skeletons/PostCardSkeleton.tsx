"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export function PostCardSkeleton() {
  return (
    <Card className="glass-card shadow-sm">
      <CardBody className="p-4">
        {/* Header: avatar + name + time */}
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="skeleton-bone rounded-full w-8 h-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="skeleton-bone h-3 w-28 rounded-lg" />
            <Skeleton className="skeleton-bone h-2.5 w-16 rounded-lg" />
          </div>
        </div>

        {/* Title */}
        <Skeleton className="skeleton-bone h-4 w-3/5 rounded-lg mb-2" />

        {/* Content lines */}
        <div className="space-y-1.5 mb-3">
          <Skeleton className="skeleton-bone h-3 w-full rounded-lg" />
          <Skeleton className="skeleton-bone h-3 w-4/5 rounded-lg" />
        </div>

        {/* Reaction buttons area */}
        <div className="flex items-center gap-4 mt-3 pt-2">
          <Skeleton className="skeleton-bone h-6 w-12 rounded-lg" />
          <Skeleton className="skeleton-bone h-6 w-12 rounded-lg" />
        </div>

        {/* Comments */}
        <Skeleton className="skeleton-bone h-3 w-24 rounded-lg mt-3" />
      </CardBody>
    </Card>
  );
}

export function PostCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}
