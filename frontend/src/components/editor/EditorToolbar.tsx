"use client";

import { Button } from "@heroui/react";
import type { Editor } from "@tiptap/react";
import { useRef } from "react";

interface EditorToolbarProps {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string | null>;
}

// --- Toolbar Icons ---

function BoldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

function StrikeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="M17.5 7.5A4 4 0 0 0 14 6H9a4 4 0 0 0 0 8" />
      <path d="M9.5 16.5A4 4 0 0 0 14 18h1a4 4 0 0 0 0-8" />
    </svg>
  );
}

function H2Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <text x="2" y="17" fontSize="14" fontWeight="bold" fontFamily="system-ui">H2</text>
    </svg>
  );
}

function H3Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <text x="2" y="17" fontSize="14" fontWeight="bold" fontFamily="system-ui">H3</text>
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="10" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="10" y1="18" x2="20" y2="18" />
      <text x="2" y="8" fontSize="8" fill="currentColor" stroke="none" fontFamily="system-ui">1</text>
      <text x="2" y="14" fontSize="8" fill="currentColor" stroke="none" fontFamily="system-ui">2</text>
      <text x="2" y="20" fontSize="8" fill="currentColor" stroke="none" fontFamily="system-ui">3</text>
    </svg>
  );
}

function BlockquoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M10 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8zM20 8V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V8z" opacity="0.6" />
    </svg>
  );
}

function DividerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-default-200 mx-0.5" />;
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  function handleImageInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload || !editor) return;

    onImageUpload(file).then((url) => {
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const btnClass = (active: boolean) =>
    active
      ? "text-primary bg-primary/10"
      : "text-default-400 hover:text-primary";

  return (
    <div className="flex items-center gap-0.5 p-1.5 border-b border-default-200 flex-wrap">
      {/* Text formatting */}
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("bold"))} onPress={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
        <BoldIcon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("italic"))} onPress={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
        <ItalicIcon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("underline"))} onPress={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline">
        <UnderlineIcon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("strike"))} onPress={() => editor.chain().focus().toggleStrike().run()} aria-label="Strikethrough">
        <StrikeIcon />
      </Button>

      <Divider />

      {/* Headings */}
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("heading", { level: 2 }))} onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading 2">
        <H2Icon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("heading", { level: 3 }))} onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Heading 3">
        <H3Icon />
      </Button>

      <Divider />

      {/* Lists */}
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("bulletList"))} onPress={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
        <BulletListIcon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("orderedList"))} onPress={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Ordered list">
        <OrderedListIcon />
      </Button>

      <Divider />

      {/* Block elements */}
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("blockquote"))} onPress={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Blockquote">
        <BlockquoteIcon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(editor.isActive("codeBlock"))} onPress={() => editor.chain().focus().toggleCodeBlock().run()} aria-label="Code block">
        <CodeIcon />
      </Button>
      <Button isIconOnly variant="light" size="sm" className={btnClass(false)} onPress={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Horizontal rule">
        <DividerIcon />
      </Button>

      <Divider />

      {/* Image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageInput}
      />
      <Button isIconOnly variant="light" size="sm" className={btnClass(false)} onPress={() => fileInputRef.current?.click()} aria-label="Insert image">
        <ImageIcon />
      </Button>
    </div>
  );
}
