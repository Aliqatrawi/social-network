"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export function GroupCardSkeleton() {
  return (
    <Card className="glass-card shadow-sm">
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="skeleton-bone rounded-xl w-12 h-12 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="skeleton-bone h-4 w-36 rounded-lg" />
            <Skeleton className="skeleton-bone h-3 w-full rounded-lg" />
            <Skeleton className="skeleton-bone h-3 w-2/3 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2">
          <Skeleton className="skeleton-bone h-3 w-24 rounded-lg" />
          <Skeleton className="skeleton-bone h-8 w-16 rounded-lg" />
        </div>
      </CardBody>
    </Card>
  );
}

export function GroupCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <GroupCardSkeleton key={i} />
      ))}
    </div>
  );
}
