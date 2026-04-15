"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export function EventCardSkeleton() {
  return (
    <Card className="glass-card shadow-sm">
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="skeleton-bone rounded-lg w-10 h-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="skeleton-bone h-4 w-40 rounded-lg" />
            <Skeleton className="skeleton-bone h-3 w-32 rounded-lg" />
            <Skeleton className="skeleton-bone h-3 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Skeleton className="skeleton-bone h-8 w-20 rounded-lg" />
        </div>
      </CardBody>
    </Card>
  );
}

export function EventCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
