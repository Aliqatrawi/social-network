"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export function GroupDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Group Header */}
      <Card className="glass-card shadow-sm">
        <CardBody className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="skeleton-bone rounded-xl w-16 h-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="skeleton-bone h-5 w-48 rounded-lg" />
              <Skeleton className="skeleton-bone h-3 w-full rounded-lg" />
              <Skeleton className="skeleton-bone h-3 w-2/3 rounded-lg" />
              <div className="flex items-center gap-3 mt-2">
                <Skeleton className="skeleton-bone h-3 w-20 rounded-lg" />
                <Skeleton className="skeleton-bone h-3 w-20 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="skeleton-bone h-9 w-24 rounded-lg" />
            <Skeleton className="skeleton-bone h-9 w-24 rounded-lg" />
          </div>
        </CardBody>
      </Card>

      {/* Tabs placeholder */}
      <div className="flex gap-4 mb-4">
        <Skeleton className="skeleton-bone h-9 w-20 rounded-lg" />
        <Skeleton className="skeleton-bone h-9 w-20 rounded-lg" />
        <Skeleton className="skeleton-bone h-9 w-20 rounded-lg" />
      </div>

      {/* Post skeletons */}
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="glass-card shadow-sm">
            <CardBody className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="skeleton-bone rounded-full w-8 h-8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="skeleton-bone h-3 w-28 rounded-lg" />
                  <Skeleton className="skeleton-bone h-2.5 w-16 rounded-lg" />
                </div>
              </div>
              <Skeleton className="skeleton-bone h-4 w-3/5 rounded-lg mb-2" />
              <Skeleton className="skeleton-bone h-3 w-full rounded-lg mb-1" />
              <Skeleton className="skeleton-bone h-3 w-4/5 rounded-lg" />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
