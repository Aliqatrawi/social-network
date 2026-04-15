"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import { GroupPostCard } from "./GroupPostCard";
import { GroupPostComposer } from "./GroupPostComposer";
import { PostCardSkeletonList } from "@/components/skeletons/PostCardSkeleton";
import { getGroupPosts, type Post } from "@/lib/api";
import { useGroupContext, type GroupEvent } from "@/context/GroupContext";

interface GroupPostsListProps {
  groupId: string;
  isMember: boolean;
}

export function GroupPostsList({ groupId, isMember }: GroupPostsListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { onGroupEvent } = useGroupContext();

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    const result = await getGroupPosts(groupId);
    if (result.data) setPosts(result.data);
    setIsLoading(false);
  }, [groupId]);

  // Load posts once on mount
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Listen to group events (mainly for posts from other users)
  useEffect(() => {
    const unsubscribe = onGroupEvent((event: GroupEvent) => {
      if (event.groupId !== groupId) return;

      switch (event.type) {
        case "post_created":
          // Add new post from other users
          if (event.data?.post) {
            setPosts((prev) => {
              // Double-check post isn't already there
              if (prev.some(p => p.id === event.data!.post.id)) {
                return prev;
              }
              return [event.data!.post, ...prev];
            });
          }
          break;
        case "post_deleted":
          // Post was deleted
          if (event.data?.postId) {
            setPosts((prev) => prev.filter((p) => p.id !== event.data!.postId));
          }
          break;
        case "comment_added":
          // Update comment count for the post
          if (event.data?.postId) {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === event.data!.postId
                  ? { ...p, commentCount: (p.commentCount || 0) + 1 }
                  : p
              )
            );
          }
          break;
      }
    });

    return unsubscribe;
  }, [groupId, onGroupEvent]);

  function handlePostCreated(newPost: Post) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleDeletePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (isLoading) {
    return <PostCardSkeletonList count={3} />;
  }

  return (
    <div className="space-y-4">
      {isMember && (
        <GroupPostComposer groupId={groupId} onPostCreated={handlePostCreated} />
      )}

      {posts.length > 0 ? (
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <GroupPostCard key={post.id} post={post} groupId={groupId} onDelete={handleDeletePost} />
          ))}
        </AnimatePresence>
      ) : (
        <Card className="glass-card">
        <CardBody className="p-8 text-center">
          <p className="text-default-400 text-sm">
            No posts yet. {isMember ? "Be the first to share something!" : ""}
          </p>
        </CardBody>
        </Card>
      )}
    </div>
  );
}
