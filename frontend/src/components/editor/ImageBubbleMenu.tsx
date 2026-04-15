"use client";

import { useEffect, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";

interface ImageBubbleMenuProps {
  editor: Editor;
}

interface MenuPosition {
  top: number;
  left: number;
}

function AlignLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SizeSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <text x="5" y="16" fontSize="11" fontWeight="600" fontFamily="system-ui">S</text>
    </svg>
  );
}

function SizeMediumIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <text x="4" y="16" fontSize="11" fontWeight="600" fontFamily="system-ui">M</text>
    </svg>
  );
}

function SizeFullIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="5" width="18" height="14" rx="2" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Separator() {
  return <div className="w-px h-5 bg-default-300 mx-0.5" />;
}

export function ImageBubbleMenu({ editor }: ImageBubbleMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });

  const updateMenu = useCallback(() => {
    if (!editor.isActive("image")) {
      setVisible(false);
      return;
    }

    // Find the selected image DOM node
    const { node } = editor.state.selection as unknown as { node?: { type: { name: string } } };
    if (!node || node.type.name !== "image") {
      setVisible(false);
      return;
    }

    const domNode = editor.view.domAtPos(editor.state.selection.from).node;
    const imgEl = domNode instanceof HTMLImageElement
      ? domNode
      : (domNode as HTMLElement).querySelector?.("img");

    if (!imgEl) {
      setVisible(false);
      return;
    }

    const editorEl = editor.view.dom.closest(".glass-input");
    if (!editorEl) {
      setVisible(false);
      return;
    }

    const editorRect = editorEl.getBoundingClientRect();
    const imgRect = imgEl.getBoundingClientRect();

    setPosition({
      top: imgRect.top - editorRect.top - 44,
      left: imgRect.left - editorRect.left + imgRect.width / 2,
    });
    setVisible(true);
  }, [editor]);

  useEffect(() => {
    editor.on("selectionUpdate", updateMenu);
    editor.on("transaction", updateMenu);
    return () => {
      editor.off("selectionUpdate", updateMenu);
      editor.off("transaction", updateMenu);
    };
  }, [editor, updateMenu]);

  if (!visible) return null;

  const attrs = editor.getAttributes("image");
  const currentAlign = attrs["data-align"] || "center";
  const currentWidth = attrs.width || "100%";

  function setAlign(align: string) {
    editor.chain().updateAttributes("image", { "data-align": align }).run();
  }

  function setSize(width: string) {
    editor.chain().updateAttributes("image", { width }).run();
  }

  function deleteImage() {
    editor.chain().focus().deleteSelection().run();
  }

  const btnBase = "flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer";
  const btnActive = (active: boolean) =>
    active
      ? `${btnBase} text-primary bg-primary/10`
      : `${btnBase} text-default-500 hover:text-foreground hover:bg-default-100`;

  return (
    <div
      className="absolute z-50 -translate-x-1/2"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-0.5 bg-content1 shadow-lg rounded-lg p-1 border border-default-200 whitespace-nowrap">
        {/* Alignment */}
        <button type="button" className={btnActive(currentAlign === "left")} onClick={() => setAlign("left")} title="Align left">
          <AlignLeftIcon />
        </button>
        <button type="button" className={btnActive(currentAlign === "center")} onClick={() => setAlign("center")} title="Align center">
          <AlignCenterIcon />
        </button>
        <button type="button" className={btnActive(currentAlign === "right")} onClick={() => setAlign("right")} title="Align right">
          <AlignRightIcon />
        </button>

        <Separator />

        {/* Size */}
        <button type="button" className={btnActive(currentWidth === "250px")} onClick={() => setSize("250px")} title="Small">
          <SizeSmallIcon />
        </button>
        <button type="button" className={btnActive(currentWidth === "400px")} onClick={() => setSize("400px")} title="Medium">
          <SizeMediumIcon />
        </button>
        <button type="button" className={btnActive(currentWidth === "100%")} onClick={() => setSize("100%")} title="Full width">
          <SizeFullIcon />
        </button>

        <Separator />

        {/* Delete */}
        <button type="button" className={`${btnBase} text-danger hover:bg-danger/10`} onClick={deleteImage} title="Delete image">
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}
