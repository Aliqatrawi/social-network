"use client";

import { useState, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
} from "@heroui/react";
import { createGroup, uploadFile, type Group } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { TagInput } from "@/components/feed/TagInput";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated?: (group: Group) => void;
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({ title: "Invalid file", description: "Please upload an image file.", color: "warning" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast({ title: "File too large", description: "Image must be under 5MB.", color: "warning" });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    if (!title.trim() || !description.trim()) return;

    setIsCreating(true);

    let imageUrl: string | undefined;
    if (imageFile) {
      const uploadResult = await uploadFile(imageFile);
      if (uploadResult.error) {
        showToast({ title: "Image upload failed", description: uploadResult.error, color: "danger" });
        setIsCreating(false);
        return;
      }
      imageUrl = uploadResult.data?.url;
    }

    const result = await createGroup({
      name: title.trim(),
      description: description.trim(),
      tags: tags.length > 0 ? tags : undefined,
      imageUrl,
    });

    if (result.error) {
      showToast({ title: "Create failed", description: result.error, color: "danger" });
      setIsCreating(false);
      return;
    }

    showToast({ title: "Group created!", color: "success" });
    setTitle("");
    setDescription("");
    setTags([]);
    removeImage();
    setIsCreating(false);
    onClose();

    if (result.data) {
      onGroupCreated?.(result.data);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" disableAnimation>
      <ModalContent>
        <ModalHeader>Create Group</ModalHeader>
        <ModalBody>
          <Input
            label="Group name"
            placeholder="e.g. Photography Club"
            value={title}
            onValueChange={(value) => {
              if (value.length <= 15) {
                setTitle(value);
              }
            }}
            maxLength={15}
            variant="bordered"
            classNames={{ inputWrapper: "glass-input" }}
            description={`${title.length}/15`}
          />
          <Textarea
            label="Description"
            placeholder="What's this group about?"
            value={description}
            onValueChange={(value) => {
              if (value.length <= 30) {
                setDescription(value);
              }
            }}
            maxLength={30}
            variant="bordered"
            minRows={3}
            maxRows={6}
            classNames={{ inputWrapper: "glass-input" }}
            description={`${description.length}/30`}
          />

          {/* Group photo (optional) */}
          <div>
            <p className="text-xs text-default-500 mb-1">Group Photo</p>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Group photo preview"
                  className="w-full h-32 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-default-200 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-default-400 hover:text-primary transition-colors cursor-pointer"
                >
                  <ImageIcon />
                  <span className="text-xs">Add a photo (optional)</span>
                </button>
              </>
            )}
          </div>

          <div>
            <p className="text-xs text-default-500 mb-1">Tags</p>
            <TagInput tags={tags} onChange={setTags} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isLoading={isCreating}
            isDisabled={!title.trim() || !description.trim()}
            onPress={handleCreate}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
