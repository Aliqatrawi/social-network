"use client";

import { useState } from "react";
import { reactToPost } from "@/lib/api";

interface ReactionBarProps {
  postId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: "like" | "dislike" | null;
}

function ThumbUpIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66a4.8 4.8 0 0 0-.88-1.12L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84A2.33 2.33 0 0 0 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path d="M1 22h3V9H1z" />
    </svg>
  );
}

function ThumbDownIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M22 4h-2c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h2V4zM2.17 11.12c-.11.25-.17.52-.17.8V13c0 1.1.9 2 2 2h5.5l-.92 4.65c-.05.22-.02.46.08.66.23.4.52.77.88 1.12L10 22l6.41-6.41c.38-.38.59-.89.59-1.42V6.34A2.33 2.33 0 0 0 14.66 4H6.56c-.7 0-1.36.37-1.72.97l-2.67 6.15z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path d="M23 2h-3v13h3z" />
    </svg>
  );
}

export function ReactionBar({
  postId,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
}: ReactionBarProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState(initialUserReaction);

  async function handleReaction(reaction: "like" | "dislike") {
    const prevLike = likeCount;
    const prevDislike = dislikeCount;
    const prevReaction = userReaction;

    // Optimistic update
    if (userReaction === reaction) {
      // Toggle off
      setUserReaction(null);
      if (reaction === "like") setLikeCount((c) => c - 1);
      else setDislikeCount((c) => c - 1);
    } else {
      // Switch or set
      if (userReaction === "like") setLikeCount((c) => c - 1);
      if (userReaction === "dislike") setDislikeCount((c) => c - 1);
      setUserReaction(reaction);
      if (reaction === "like") setLikeCount((c) => c + 1);
      else setDislikeCount((c) => c + 1);
    }

    const result = await reactToPost(postId, reaction);

    if (result.error) {
      // Revert
      setLikeCount(prevLike);
      setDislikeCount(prevDislike);
      setUserReaction(prevReaction);
    } else if (result.data) {
      // Sync with server
      setLikeCount(result.data.likeCount);
      setDislikeCount(result.data.dislikeCount);
      setUserReaction(result.data.userReaction);
    }
  }

  return (
    <div className="flex items-center gap-1 mt-3 border-t border-white/10 dark:border-white/5 pt-3">
      <button
        type="button"
        onClick={() => handleReaction("like")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
          userReaction === "like"
            ? "text-primary bg-primary/10"
            : "text-default-500 hover:text-primary hover:bg-default-100/50"
        }`}
      >
        <ThumbUpIcon filled={userReaction === "like"} />
        {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
      </button>
      <button
        type="button"
        onClick={() => handleReaction("dislike")}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
          userReaction === "dislike"
            ? "text-danger bg-danger/10"
            : "text-default-500 hover:text-danger hover:bg-default-100/50"
        }`}
      >
        <ThumbDownIcon filled={userReaction === "dislike"} />
        {dislikeCount > 0 && <span className="text-xs font-medium">{dislikeCount}</span>}
      </button>
    </div>
  );
}
