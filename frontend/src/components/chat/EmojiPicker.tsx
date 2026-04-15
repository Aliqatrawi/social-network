"use client";

import { Popover, PopoverTrigger, PopoverContent, Button } from "@heroui/react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES: Record<string, string[]> = {
  Smileys: ["😀", "😂", "🥹", "😍", "🤩", "😎", "🤔", "😅"],
  Gestures: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "💪"],
  Hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍"],
  Reactions: ["🔥", "✨", "🎉", "💯", "⭐", "🚀", "👀", "💬"],
  Nature: ["🌊", "🌅", "🌙", "☀️", "🌸", "🍃", "🦋", "🐬"],
};

function SmileyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <Popover placement="top-start">
      <PopoverTrigger>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="text-default-400 hover:text-primary"
          aria-label="Emoji picker"
        >
          <SmileyIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-3 max-w-[280px]">
        <div className="space-y-2">
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category}>
              <p className="text-[10px] text-default-400 font-medium mb-1">
                {category}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-default-100 hover:scale-110 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
