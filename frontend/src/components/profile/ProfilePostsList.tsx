"use client";

import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/lib/api";

interface ProfilePostsListProps {
  posts: Post[];
}

export function ProfilePostsList({ posts }: ProfilePostsListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-10 h-10 mx-auto text-default-300 mb-3"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <p className="text-default-400 text-sm">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </AnimatePresence>
    </div>
  );
}
