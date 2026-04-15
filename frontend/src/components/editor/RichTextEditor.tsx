"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BaseImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";

const ExitBlockOnBackspace = Extension.create({
  name: "exitBlockOnBackspace",
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { empty, $anchor } = editor.state.selection;
        if (!empty || $anchor.parentOffset !== 0) return false;
        if ($anchor.parent.textContent.length !== 0) return false;

        if (editor.isActive("listItem")) {
          return editor.chain().liftListItem("listItem").run();
        }
        if (editor.isActive("blockquote")) {
          return editor.chain().lift("blockquote").run();
        }
        if (editor.isActive("codeBlock") || editor.isActive("heading")) {
          return editor.chain().setNode("paragraph").run();
        }
        return false;
      },
    };
  },
});
import { EditorToolbar } from "./EditorToolbar";
import { ImageBubbleMenu } from "./ImageBubbleMenu";
import { useEffect, type MutableRefObject } from "react";
import type { Editor } from "@tiptap/react";

const CustomImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("width") || element.style.width || null,
        renderHTML: (attributes: Record<string, string>) => {
          if (!attributes.width) return {};
          return { width: attributes.width, style: `width: ${attributes.width}` };
        },
      },
      "data-align": {
        default: "center",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes: Record<string, string>) => {
          return { "data-align": attributes["data-align"] || "center" };
        },
      },
    };
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
  editorRef?: MutableRefObject<Editor | null>;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "What's on your mind?",
  onImageUpload,
  editorRef,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      CustomImage.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      ExitBlockOnBackspace,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-text-content outline-none min-h-[80px] max-h-[400px] overflow-y-auto px-3 py-2 text-sm",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files.length > 0 && onImageUpload) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            onImageUpload(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items || !onImageUpload) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              onImageUpload(file).then((url) => {
                if (url && editor) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              });
              return true;
            }
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // Expose editor instance to parent via ref
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  return (
    <div className="glass-input rounded-xl border border-default-200 overflow-hidden transition-all focus-within:border-primary relative">
      <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      <EditorContent editor={editor} />
      {editor && <ImageBubbleMenu editor={editor} />}
    </div>
  );
}

// Export a hook to use the editor from parent components
export { useEditor } from "@tiptap/react";
export type { Editor } from "@tiptap/react";
