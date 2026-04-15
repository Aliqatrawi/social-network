"use client";

import { useState } from "react";
import {
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { deleteComment, type Comment } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface CommentItemProps {
  comment: Comment;
  onDelete?: (commentId: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function CommentItem({ comment, onDelete }: CommentItemProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwn = user?.id === comment.userId;

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteComment(comment.id);

    if (result.error) {
      showToast({
        title: "Delete failed",
        description: result.error,
        color: "danger",
      });
      setIsDeleting(false);
      return;
    }

    showToast({
      title: "Comment deleted",
      color: "primary",
    });
    onDelete?.(comment.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl p-3 bg-black/5 dark:bg-white/5"
    >
      <div className="flex gap-2">
        <Link href={`/profile/${comment.userId}`}>
          <Avatar
            src={comment.author.avatarUrl}
            name={`${comment.author.firstName} ${comment.author.lastName}`}
            size="sm"
            className="cursor-pointer shrink-0"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${comment.userId}`}
                className="text-xs font-medium hover:text-primary transition-colors"
              >
                {comment.author.firstName} {comment.author.lastName}
              </Link>
              <span className="text-[10px] text-default-400">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>
            {isOwn && (
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    className="text-default-400 h-6 w-6 min-w-6"
                    isDisabled={isDeleting}
                  >
                    <MoreIcon />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Comment actions">
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    onPress={handleDelete}
                  >
                    Delete comment
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>
          {comment.imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden">
              <img
                src={comment.imageUrl}
                alt="Comment image"
                className="w-full h-auto object-cover max-h-48"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
