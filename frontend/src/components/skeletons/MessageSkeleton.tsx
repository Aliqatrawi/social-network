"use client";

import { Skeleton } from "@heroui/react";

function MessageBubbleSkeleton({ isOwn }: { isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      {!isOwn && <Skeleton className="skeleton-bone rounded-full w-8 h-8 shrink-0 mr-2" />}
      <Skeleton
        className={`skeleton-bone rounded-2xl ${isOwn ? "w-48 h-10" : "w-56 h-12"}`}
      />
    </div>
  );
}

export function MessageSkeletonList() {
  return (
    <div className="flex-1 p-4 space-y-1">
      <MessageBubbleSkeleton isOwn={false} />
      <MessageBubbleSkeleton isOwn={false} />
      <MessageBubbleSkeleton isOwn={true} />
      <MessageBubbleSkeleton isOwn={false} />
      <MessageBubbleSkeleton isOwn={true} />
      <MessageBubbleSkeleton isOwn={true} />
    </div>
  );
}
