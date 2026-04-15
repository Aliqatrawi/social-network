"use client";

import { useState, useRef } from "react";
import { Avatar, Button, Textarea } from "@heroui/react";
import { useAuth } from "@/context/AuthContext";
import { createComment, type Comment } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface CommentInputProps {
  postId: string;
  groupId?: string;
  onCommentCreated?: (comment: Comment) => void;
}

function ImageIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-3 h-3"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function CommentInput({ postId, onCommentCreated }: CommentInputProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        title: "Invalid file",
        description: "Please upload an image file.",
        color: "warning",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast({
        title: "File too large",
        description: "Image must be under 5MB.",
        color: "warning",
      });
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!content.trim() && !image) return;

    setIsSubmitting(true);
    const result = await createComment({
      postId,
      content: content.trim(),
      image: image || undefined,
    });

    if (result.error) {
      showToast({
        title: "Comment failed",
        description: result.error,
        color: "danger",
      });
      setIsSubmitting(false);
      return;
    }

    setContent("");
    removeImage();
    setIsSubmitting(false);

    if (result.data) {
      // Call callback to update comment count/list immediately on this client
      onCommentCreated?.(result.data);
      // Don't emit local event - backend will broadcast via WebSocket
      // Comment count dedup check will filter any duplicates
    }
  }

  return (
    <div className="rounded-xl p-3 bg-black/5 dark:bg-white/5">
      <div className="flex gap-2">
        <Avatar
          src={user?.avatarUrl}
          name={user ? `${user.firstName} ${user.lastName}` : undefined}
          size="sm"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <Textarea
            placeholder="Write a comment..."
            value={content}
            onValueChange={setContent}
            variant="bordered"
            minRows={1}
            maxRows={6}
            maxLength={1000}
            size="sm"
            classNames={{
              inputWrapper: "glass-input min-h-[36px]",
              input: "text-xs",
            }}
            description={content.length > 0 ? `${content.length}/1000` : undefined}
          />

          {imagePreview && (
            <div className="relative mt-2 rounded-lg overflow-hidden inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="max-h-32 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-default-400 hover:text-primary h-7 w-7 min-w-7"
                onPress={() => fileInputRef.current?.click()}
                aria-label="Add image"
              >
                <ImageIcon />
              </Button>
            </div>

            <Button
              color="primary"
              size="sm"
              className="font-semibold text-xs px-4 h-7"
              isLoading={isSubmitting}
              isDisabled={!content.trim() && !image}
              onPress={handleSubmit}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
