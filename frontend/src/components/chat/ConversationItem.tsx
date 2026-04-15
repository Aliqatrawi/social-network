"use client";

import { Avatar } from "@heroui/react";
import { useAuth } from "@/context/AuthContext";
import type { Conversation } from "@/lib/api";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ConversationItem({ conversation, isSelected, onSelect }: ConversationItemProps) {
  const { user } = useAuth();
  const isGroup = conversation.type === "group";
  const name = isGroup
    ? conversation.group?.title || "Group"
    : `${conversation.participant?.firstName || ""} ${conversation.participant?.lastName || ""}`.trim();

  const avatarSrc = isGroup ? conversation.group?.imageUrl : conversation.participant?.avatarUrl;
  const lastMsg = conversation.lastMessage;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-150 cursor-pointer ${
        isSelected
          ? "bg-primary/15 border-l-2 border-primary"
          : "hover:bg-default-100/50 border-l-2 border-transparent"
      }`}
    >
      <div className="relative shrink-0">
        <Avatar
          src={avatarSrc}
          name={name}
          size="md"
          className={isGroup ? "bg-secondary/20 text-secondary" : ""}
        />
        {isGroup && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-white">
            <GroupIcon />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{name}</p>
          {lastMsg && (
            <span className="text-[10px] text-default-400 shrink-0">
              {formatRelativeTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        {lastMsg && (
          <p className="text-xs text-default-400 truncate mt-0.5">
            {lastMsg.senderId === user?.id
              ? "You: "
              : isGroup && lastMsg.senderName
                ? `${lastMsg.senderName}: `
                : ""}
            {lastMsg.content}
          </p>
        )}
      </div>

      {conversation.unreadCount > 0 && (
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-white">
            {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
          </span>
        </div>
      )}
    </button>
  );
}
