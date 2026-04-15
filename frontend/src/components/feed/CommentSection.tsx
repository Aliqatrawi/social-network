"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getPostComments, type Comment } from "@/lib/api";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { CommentSkeletonList } from "@/components/skeletons/CommentSkeleton";

interface CommentSectionProps {
  postId: string;
  groupId?: string;
  commentCount?: number;
}

function CommentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function CommentSection({ postId, groupId, commentCount = 0 }: CommentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  async function loadComments() {
    if (hasFetched) return;
    setIsLoading(true);
    const result = await getPostComments(postId);
    if (result.data) {
      setComments(result.data);
    }
    setHasFetched(true);
    setIsLoading(false);
  }

  function handleToggle() {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next && !hasFetched) {
      loadComments();
    }
  }

  function handleCommentCreated(newComment: Comment) {
    setComments((prev) => [newComment, ...prev]);
  }

  function handleCommentDeleted(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  const count = hasFetched ? comments.length : commentCount;

  return (
    <div className="mt-3 border-t border-white/10 dark:border-white/5 pt-3">
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 text-sm text-default-500 hover:text-primary transition-colors"
      >
        <CommentIcon />
        <span>
          {count} {count === 1 ? "comment" : "comments"}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              {isLoading ? (
                <CommentSkeletonList count={2} />
              ) : (
                <AnimatePresence mode="popLayout">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onDelete={handleCommentDeleted}
                    />
                  ))}
                </AnimatePresence>
              )}

              {hasFetched && !isLoading && comments.length === 0 && (
                <p className="text-center text-default-400 text-xs py-3">
                  No comments yet. Be the first to comment!
                </p>
              )}

              <CommentInput
                postId={postId}
                groupId={groupId}
                onCommentCreated={handleCommentCreated}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
