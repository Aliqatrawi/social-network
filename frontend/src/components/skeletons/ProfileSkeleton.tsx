"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <Card className="glass-card shadow-xl overflow-hidden">
        {/* Cover image */}
        <Skeleton className="skeleton-bone w-full h-32 sm:h-44" />

        <div className="px-6 pb-6">
          {/* Avatar + Name */}
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <Skeleton className="skeleton-bone rounded-full w-20 h-20 shrink-0 border-4 border-background" />
            <div className="flex-1 space-y-2 pb-1">
              <Skeleton className="skeleton-bone h-5 w-40 rounded-lg" />
              <Skeleton className="skeleton-bone h-3 w-24 rounded-lg" />
            </div>
          </div>

          {/* Bio */}
          <Skeleton className="skeleton-bone h-3 w-48 rounded-lg mb-4" />

          {/* Stats */}
          <div className="flex items-center gap-6 mb-3">
            <Skeleton className="skeleton-bone h-4 w-20 rounded-lg" />
            <Skeleton className="skeleton-bone h-4 w-20 rounded-lg" />
            <Skeleton className="skeleton-bone h-4 w-20 rounded-lg" />
          </div>

          {/* Edit button */}
          <div className="flex justify-end pt-2">
            <Skeleton className="skeleton-bone h-8 w-28 rounded-lg" />
          </div>
        </div>
      </Card>

      {/* Activities Card */}
      <Card className="glass-card shadow-lg">
        <CardBody className="p-4 sm:p-6">
          <Skeleton className="skeleton-bone h-5 w-24 rounded-lg mb-4" />

          {/* Activity items */}
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="skeleton-bone h-3 w-20 rounded-lg mb-2" />
                <Card className="glass-card shadow-sm">
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
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
