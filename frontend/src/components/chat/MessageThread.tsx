"use client";

import { useEffect, useRef } from "react";
import { Avatar, Button, Spinner } from "@heroui/react";
import { useAuth } from "@/context/AuthContext";
import { useChatRealtime } from "@/hooks/useChatRealtime";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { MessageSkeletonList } from "@/components/skeletons/MessageSkeleton";
import type { Conversation } from "@/lib/api";

interface MessageThreadProps {
  conversation: Conversation;
  onBack: () => void;
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function TypingIndicator({ userName }: { userName: string | null }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 ml-10">
      <div className="flex gap-1 px-3 py-2 rounded-2xl bg-black/5 dark:bg-white/10">
        <div className="w-2 h-2 rounded-full bg-default-400 typing-dot" />
        <div className="w-2 h-2 rounded-full bg-default-400 typing-dot" />
        <div className="w-2 h-2 rounded-full bg-default-400 typing-dot" />
      </div>
      {userName && (
        <span className="text-[10px] text-default-400">{userName} is typing</span>
      )}
    </div>
  );
}

export function MessageThread({ conversation, onBack }: MessageThreadProps) {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isTyping,
    typingUser,
    sendMessage,
    sendTyping,
    loadMore,
  } = useChatRealtime(conversation.id);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const isGroup = conversation.type === "group";
  const name = isGroup
    ? conversation.group?.title || "Group"
    : `${conversation.participant?.firstName || ""} ${
        conversation.participant?.lastName || ""
      }`.trim();
  const avatarSrc = isGroup ? conversation.group?.imageUrl : conversation.participant?.avatarUrl;

  // Reset when conversation changes
  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [conversation.id]);

  // Auto-scroll to bottom on initial load and when new messages arrive at the end
  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) return;

    const lastId = messages[messages.length - 1]?.id ?? null;
    const prevLastId = lastMessageIdRef.current;
    lastMessageIdRef.current = lastId;

    // Scroll to bottom when: initial load, or last message changed (new msg appended)
    if (prevLastId === null || lastId !== prevLastId) {
      bottomRef.current?.scrollIntoView({ behavior: prevLastId === null ? "instant" : "smooth" });
    }
    // If lastId is same (older messages prepended), don't scroll — user stays in place
  }, [messages]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isTyping) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTyping]);

  // Load older messages with scroll position preservation
  async function handleLoadMore() {
    const container = scrollRef.current;
    if (!container) return;

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    const count = await loadMore();

    if (count > 0) {
      // After React re-renders with prepended messages, restore position
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
      });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="lg:hidden text-default-400"
          onPress={onBack}
          aria-label="Back"
        >
          <BackIcon />
        </Button>
        <Avatar
          src={avatarSrc}
          name={name}
          size="sm"
          className={isGroup ? "bg-secondary/20 text-secondary" : ""}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {isGroup && conversation.group && (
            <p className="text-[10px] text-default-400">
              {conversation.group.memberCount} members
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto chat-scroll px-4 py-4 space-y-2"
      >
        {isLoading ? (
          <MessageSkeletonList />
        ) : messages.length > 0 ? (
          <>
            {/* Load older messages */}
            {hasMore && (
              <div className="flex justify-center py-2">
                {isLoadingMore ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    className="text-xs text-primary hover:underline"
                  >
                    Load older messages
                  </button>
                )}
              </div>
            )}

            {messages.map((msg, idx) => {
              const isOwn = msg.senderId === user?.id;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showSender =
                isGroup && !isOwn && msg.senderId !== prevMsg?.senderId;

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={isOwn}
                  showSender={showSender}
                />
              );
            })}
            {isTyping && <TypingIndicator userName={typingUser} />}
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-default-400 text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} onTyping={sendTyping} />
    </div>
  );
}
