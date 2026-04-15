"use client";

import { useState, useRef, useCallback } from "react";
import { Avatar, Button, Card, CardBody, Input } from "@heroui/react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { createGroupPost, uploadFile, type Post } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { TagInput } from "@/components/feed/TagInput";
import type { Editor } from "@tiptap/react";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false }
);

const MAX_POST_CONTENT_LENGTH = 5000;

function getTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").trim().length;
}

function hasMeaningfulContent(html: string): boolean {
  const textLength = getTextLength(html);
  if (textLength > 0) return true;
  return /<img\b/i.test(html);
}

interface GroupPostComposerProps {
  groupId: string;
  onPostCreated?: (post: Post) => void;
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

export function GroupPostComposer({ groupId, onPostCreated }: GroupPostComposerProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const handleEditorImageUpload = useCallback(async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      showToast({ title: "File too large", description: "Image must be under 5MB.", color: "warning" });
      return null;
    }
    const result = await uploadFile(file);
    if (result.error || !result.data) {
      showToast({ title: "Upload failed", description: result.error || "Could not upload image.", color: "danger" });
      return null;
    }
    return result.data.url;
  }, []);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({ title: "Invalid file", description: "Please upload an image file.", color: "warning" });
      return;
    }

    const url = await handleEditorImageUpload(file);
    if (url && editorRef.current) {
      editorRef.current.chain().focus().setImage({ src: url }).run();
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!title.trim() || !hasMeaningfulContent(content)) return;
    if (getTextLength(content) > MAX_POST_CONTENT_LENGTH) {
      showToast({ title: "Content too long", description: `Post content must be ${MAX_POST_CONTENT_LENGTH} characters or less`, color: "warning" });
      return;
    }

    setIsPosting(true);
    const result = await createGroupPost({
      groupId,
      title: title.trim(),
      content,
      tags: tags.length > 0 ? tags : undefined,
      contentFormat: "html",
    });

    if (result.error) {
      showToast({ title: "Post failed", description: result.error, color: "danger" });
      setIsPosting(false);
      return;
    }

    showToast({ title: "Post shared!", color: "success" });
    setTitle("");
    setContent("");
    setTags([]);
    editorRef.current?.commands.clearContent();
    setIsPosting(false);

    if (result.data) {
      // Call callback to update UI immediately on this client
      onPostCreated?.(result.data);
      // Don't emit local event - backend will broadcast via WebSocket
      // and dedup check will filter the post we just added
    }
  }

  return (
    <Card className="glass-card shadow-sm">
    <CardBody className="p-4">
      <div className="flex gap-3">
        <Avatar
          src={user?.avatarUrl}
          name={user ? `${user.firstName} ${user.lastName}` : undefined}
          size="sm"
          className="shrink-0 mt-1"
        />
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Post title"
            value={title}
            onValueChange={(value) => {
              if (value.length <= 100) {
                setTitle(value);
              }
            }}
            variant="bordered"
            size="sm"
            maxLength={100}
            classNames={{ inputWrapper: "glass-input" }}
            className="mb-2"
            description={`${title.length}/100`}
          />

          <RichTextEditor
            content={content}
            onChange={(html) => {
              setContent(html);
            }}
            placeholder="Share something with the group..."
            onImageUpload={handleEditorImageUpload}
            editorRef={editorRef}
          />
          <div className="flex justify-end mt-1">
            <span className={`text-[11px] ${getTextLength(content) > MAX_POST_CONTENT_LENGTH ? "text-danger font-semibold" : "text-default-400"}`}>
              {getTextLength(content)}/{MAX_POST_CONTENT_LENGTH}
            </span>
          </div>

          {/* Tags */}
          <TagInput tags={tags} onChange={setTags} />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
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
                className="text-default-400 hover:text-primary"
                onPress={() => fileInputRef.current?.click()}
                aria-label="Add image"
              >
                <ImageIcon />
              </Button>
            </div>

            <Button
              color="primary"
              size="sm"
              className="font-semibold shadow-md shadow-primary/20 px-6"
              isLoading={isPosting}
              isDisabled={!title.trim() || !hasMeaningfulContent(content)}
              onPress={handleSubmit}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </CardBody>
    </Card>
  );
}
