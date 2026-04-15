"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@heroui/react";
import { EmojiPicker } from "./EmojiPicker";

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  isDisabled?: boolean;
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

const MAX_MESSAGE_LENGTH = 3000;

export function MessageInput({ onSend, onTyping, isDisabled }: MessageInputProps) {
  const [text, setText] = useState("");
  const lastTypingRef = useRef(0);
  const isOverLimit = text.length > MAX_MESSAGE_LENGTH;

  const emitTyping = useCallback(() => {
    if (!onTyping) return;
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      onTyping();
    }
  }, [onTyping]);

  function handleSend() {
    if (!text.trim() || isOverLimit) return;
    onSend(text.trim());
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(val: string) {
    setText(val);
    if (val.trim()) emitTyping();
  }

  function handleEmojiSelect(emoji: string) {
    setText((prev) => prev + emoji);
  }

  return (
    <div className="flex flex-col gap-1 p-3 border-t border-white/10 w-full">
      <span className={`text-[11px] text-right ${isOverLimit ? "text-danger font-semibold" : "text-default-400"}`}>
        {text.length}/{MAX_MESSAGE_LENGTH}
      </span>
      <div className="flex items-end gap-2">
      <EmojiPicker onSelect={handleEmojiSelect} />
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        disabled={isDisabled}
        className="flex-1 p-2 rounded-lg border border-white/20 bg-white/5 dark:bg-white/5 text-foreground placeholder-default-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-24 min-h-10 overflow-y-auto break-words"
        rows={1}
        cols={50}
        style={{
          lineHeight: "1.5rem",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "pre-wrap",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <Button
        isIconOnly
        size="sm"
        color="primary"
        isDisabled={!text.trim() || isOverLimit || isDisabled}
        onPress={handleSend}
        className="shadow-md shadow-primary/20 shrink-0"
        aria-label="Send message"
      >
        <SendIcon />
      </Button>
      </div>
    </div>
  );
}
