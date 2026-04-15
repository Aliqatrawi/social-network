"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export function UserCardSkeleton() {
  return (
    <Card className="glass-card shadow-sm w-full">
      <CardBody className="p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="skeleton-bone rounded-full w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="skeleton-bone h-3 w-32 rounded-lg" />
            <Skeleton className="skeleton-bone h-2.5 w-20 rounded-lg" />
          </div>
          <Skeleton className="skeleton-bone h-8 w-20 rounded-lg" />
        </div>
      </CardBody>
    </Card>
  );
}

export function UserCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <UserCardSkeleton key={i} />
      ))}
    </div>
  );
}
