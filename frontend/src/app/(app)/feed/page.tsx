"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Spinner } from "@heroui/react";
import { getFeedPosts, type Post } from "@/lib/api";
import { chatSocket } from "@/lib/chatSocket";
import { PostComposer } from "@/components/feed/PostComposer";
import { FeedList } from "@/components/feed/FeedList";
import { TagFilter } from "@/components/feed/TagFilter";

const PAGE_SIZE = 10;

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadFeed = useCallback(async (tag?: string | null) => {
    setIsLoading(true);
    const result = await getFeedPosts({ limit: PAGE_SIZE, offset: 0, tag: tag || undefined });
    if (result.data) {
      setPosts(result.data);
      setHasMore(result.data.length >= PAGE_SIZE);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFeed(selectedTag);
  }, [loadFeed, selectedTag]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoadingMore(true);

    const result = await getFeedPosts({ limit: PAGE_SIZE, offset: posts.length, tag: selectedTag || undefined });
    if (result.data) {
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPosts = result.data!.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPosts];
      });
      setHasMore(result.data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setIsLoadingMore(false);
    loadingRef.current = false;
  }, [hasMore, posts.length, selectedTag]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  // Listen for real-time feed updates from other users
  useEffect(() => {
    chatSocket.connect();

    const unsub = chatSocket.onMessage((raw: any) => {
      if (raw?.type !== "feed_update") return;
      const payload = raw.payload ?? raw;
      if (payload.action === "post_created" && payload.post) {
        const newPost = payload.post as Post;
        // If filtering by tag, only add if the new post has that tag
        if (selectedTag && !newPost.tags?.includes(selectedTag)) return;
        setPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
      }
    });

    return () => { unsub(); };
  }, [selectedTag]);

  function handlePostCreated(newPost: Post) {
    // If filtering by tag, only add if the new post has that tag
    if (selectedTag && !newPost.tags?.includes(selectedTag)) return;
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleDeletePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function handleTagChange(tag: string | null) {
    setSelectedTag(tag);
    setPosts([]);
    setHasMore(true);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 max-w-2xl mx-auto"
    >
      <PostComposer onPostCreated={handlePostCreated} />
      <TagFilter selectedTag={selectedTag} onTagChange={handleTagChange} />
      <FeedList
        posts={posts}
        isLoading={isLoading}
        onDeletePost={handleDeletePost}
      />
      {hasMore && !isLoading && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isLoadingMore && <Spinner size="sm" color="primary" />}
        </div>
      )}
    </motion.div>
  );
}
