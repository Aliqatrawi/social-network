"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import { Avatar, Button, Card, CardBody, Checkbox, Input, Spinner } from "@heroui/react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { createPost, uploadFile, getUserFollowers, type Post, type FollowUser } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { PrivacySelector } from "./PrivacySelector";
import { TagInput } from "./TagInput";
import type { Editor } from "@tiptap/react";

const RichTextEditor = dynamic(
  () => import("@/components/editor/RichTextEditor").then((m) => m.RichTextEditor),
  { ssr: false }
);

const MAX_POST_CONTENT_LENGTH = 5000;

function getTextLength(html: string): number {
  return html.replace(/<[^>]*>/g, "").trim().length;
}

interface PostComposerProps {
  onPostCreated?: (post: Post) => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const { user } = useAuth();
  const editorRef = useRef<Editor | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "almost_private" | "private">("public");
  const [tags, setTags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [selectedFollowerIds, setSelectedFollowerIds] = useState<Set<string>>(new Set());
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);

  // Fetch followers when privacy is set to "private"
  useEffect(() => {
    if (privacy !== "private" || !user?.id) return;
    let cancelled = false;
    setIsLoadingFollowers(true);
    getUserFollowers(user.id).then((result) => {
      if (cancelled) return;
      if (result.data) setFollowers(result.data);
      setIsLoadingFollowers(false);
    });
    return () => { cancelled = true; };
  }, [privacy, user?.id]);

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

  // Check if editor has text or image content
  function hasContent(): boolean {
    if (editorRef.current) {
      const hasText = editorRef.current.getText().trim().length > 0;
      const hasImage = editorRef.current.getJSON().content?.some(
        (node: any) => node.type === "image" || node.content?.some((c: any) => c.type === "image")
      ) ?? false;
      return hasText || hasImage;
    }
    const hasText = content.replace(/<[^>]*>/g, "").trim().length > 0;
    const hasImage = /<img\s/i.test(content);
    return hasText || hasImage;
  }

  async function handleSubmit() {
    if (!title.trim() || !hasContent()) return;
    if (getTextLength(content) > MAX_POST_CONTENT_LENGTH) {
      showToast({ title: "Content too long", description: `Post content must be ${MAX_POST_CONTENT_LENGTH} characters or less`, color: "warning" });
      return;
    }

    if (privacy === "private" && selectedFollowerIds.size === 0) {
      showToast({ title: "No followers selected", description: "Choose at least one follower for a private post", color: "warning" });
      return;
    }

    setIsPosting(true);
    const result = await createPost({
      title: title.trim(),
      content,
      privacy,
      tags: tags.length > 0 ? tags : undefined,
      contentFormat: "html",
      selectedFollowers: privacy === "private" ? Array.from(selectedFollowerIds) : undefined,
    });

    if (result.error) {
      showToast({
        title: "Post failed",
        description: result.error,
        color: "danger",
      });
      setIsPosting(false);
      return;
    }

    showToast({
      title: "Post shared!",
      color: "success",
    });

    // Reset form
    setTitle("");
    setContent("");
    setPrivacy("public");
    setTags([]);
    setSelectedFollowerIds(new Set());
    editorRef.current?.commands.clearContent();
    setIsPosting(false);

    if (result.data) {
      onPostCreated?.(result.data);
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
            classNames={{
              inputWrapper: "glass-input",
            }}
            className="mb-2"
            description={`${title.length}/100`}
          />

          <RichTextEditor
            content={content}
            onChange={(html) => {
              setContent(html);
            }}
            placeholder="What's on your mind?"
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

          {/* Follower picker for private posts */}
          {privacy === "private" && (
            <div className="mt-2 p-3 rounded-lg border border-default-200 bg-default-50/50">
              <p className="text-xs font-semibold text-default-600 mb-2">
                Choose who can see this post
              </p>
              {isLoadingFollowers ? (
                <div className="flex justify-center py-3">
                  <Spinner size="sm" />
                </div>
              ) : followers.length === 0 ? (
                <p className="text-xs text-default-400">You have no followers yet.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {followers.map((f) => (
                    <label key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-default-100 cursor-pointer transition-colors">
                      <Checkbox
                        size="sm"
                        isSelected={selectedFollowerIds.has(f.id)}
                        onValueChange={(checked) => {
                          setSelectedFollowerIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(f.id);
                            else next.delete(f.id);
                            return next;
                          });
                        }}
                      />
                      <Avatar src={f.avatarUrl} name={`${f.firstName} ${f.lastName}`} size="sm" className="w-6 h-6" />
                      <span className="text-sm">{f.firstName} {f.lastName}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedFollowerIds.size > 0 && (
                <p className="text-xs text-primary mt-2">{selectedFollowerIds.size} selected</p>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <PrivacySelector value={privacy} onChange={setPrivacy} />
            </div>

            <Button
              color="primary"
              size="sm"
              className="font-semibold shadow-md shadow-primary/20 px-6"
              isLoading={isPosting}
              isDisabled={!title.trim() || !hasContent()}
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
