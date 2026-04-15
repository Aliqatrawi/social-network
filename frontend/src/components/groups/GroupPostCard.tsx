"use client";

import { useState } from "react";
import {
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Card,
  CardBody,
} from "@heroui/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { deletePost, type Post } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { CommentSection } from "@/components/feed/CommentSection";
import { RichTextRenderer } from "@/components/editor/RichTextRenderer";

interface GroupPostCardProps {
  post: Post;
  groupId: string;
  onDelete?: (postId: string) => void;
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
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function GroupPostCard({ post, groupId, onDelete }: GroupPostCardProps) {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const isOwn = user?.id === post.userId;

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deletePost(post.id);

    if (result.error) {
      showToast({ title: "Delete failed", description: result.error, color: "danger" });
      setIsDeleting(false);
      return;
    }

    showToast({ title: "Post deleted", color: "primary" });
    onDelete?.(post.id);
    // Don't emit local event - backend will broadcast via WebSocket
    setIsDeleting(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card shadow-sm">
      <CardBody className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profile/${post.userId}`}>
          <Avatar
            src={post.author.avatarUrl}
            name={`${post.author.firstName} ${post.author.lastName}`}
            size="sm"
            className="cursor-pointer"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${post.userId}`}
              className="text-sm font-medium hover:text-primary transition-colors truncate"
            >
              {post.author.firstName} {post.author.lastName}
            </Link>
            <span className="text-xs text-default-400">
              · {formatRelativeTime(post.createdAt)}
            </span>
          </div>
        </div>

        {isOwn && (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm" className="text-default-400" isDisabled={isDeleting}>
                <MoreIcon />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Post actions">
              <DropdownItem key="delete" className="text-danger" color="danger" onPress={handleDelete}>
                Delete post
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )}
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="font-bold text-foreground mb-2 pb-2 border-b border-default-200 font-serif text-[30px] leading-tight">{post.title}</h3>
      )}

      {/* Content */}
      <RichTextRenderer content={post.content} format={post.contentFormat || "plain"} />

      {/* Image */}
      {post.imageUrl && (
        <div className="mt-3 rounded-xl overflow-hidden">
          <img src={post.imageUrl} alt="Post image" className="w-full h-auto object-cover max-h-96" />
        </div>
      )}

      {/* Comments */}
      <CommentSection postId={post.id} groupId={groupId} commentCount={post.commentCount} />
      </CardBody>
      </Card>
    </motion.div>
  );
}
