"use client";

import { Card, CardBody } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "./PostCard";
import { PostCardSkeletonList } from "@/components/skeletons/PostCardSkeleton";
import type { Post } from "@/lib/api";

interface FeedListProps {
  posts: Post[];
  isLoading: boolean;
  onDeletePost?: (postId: string) => void;
}

export function FeedList({ posts, isLoading, onDeletePost }: FeedListProps) {
  if (isLoading) {
    return <PostCardSkeletonList count={3} />;
  }

  if (posts.length === 0) {
    return (
      <Card className="glass-card">
      <CardBody className="p-8 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-12 h-12 mx-auto text-default-300 mb-4"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <h3 className="font-semibold mb-1">No posts yet</h3>
        <p className="text-default-400 text-sm">
          Be the first to share something, or follow more people to see their
          posts.
        </p>
      </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDelete={onDeletePost} />
        ))}
      </AnimatePresence>
    </div>
  );
}
