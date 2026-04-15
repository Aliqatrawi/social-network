"use client";

import { Avatar } from "@heroui/react";
import { motion } from "framer-motion";
import type { ChatMessage } from "@/lib/api";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender: boolean;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageBubble({ message, isOwn, showSender }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isOwn && showSender && (
        <Avatar
          src={message.sender.avatarUrl}
          name={`${message.sender.firstName} ${message.sender.lastName}`.trim()}
          size="sm"
          className="shrink-0 mt-auto"
        />
      )}

      {!isOwn && !showSender && <div className="w-8 shrink-0" />}

      <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && showSender && (
          <p className="text-[10px] text-default-400 font-medium mb-0.5 ml-1">
            {`${message.sender.firstName} ${message.sender.lastName}`.trim()}
          </p>
        )}
        <div
          className={`px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden rounded-2xl ${
            isOwn
              ? "chat-bubble-own"
              : "chat-bubble-other"
          }`}
          style={{ 
            maxWidth: "100%",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {message.content}
        </div>
        <p
          className={`text-[10px] text-default-400 mt-0.5 ${
            isOwn ? "text-right mr-1" : "ml-1"
          }`}
        >
          {formatTime(message.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}
