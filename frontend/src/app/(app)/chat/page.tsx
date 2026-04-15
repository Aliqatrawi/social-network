"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getConversations, markConversationRead, type Conversation } from "@/lib/api";
import { useChat } from "@/context/ChatContext";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageThread } from "@/components/chat/MessageThread";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { onNewMessage, setActiveConversationId, refresh } = useChat();

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    const result = await getConversations();
    if (result.data) setConversations(result.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Keep ChatContext aware of which conversation is active
  useEffect(() => {
    setActiveConversationId(selectedId);
    // Refresh unread count when selecting a conversation (marks it read)
    if (selectedId) {
      refresh();
    }
    return () => setActiveConversationId(null);
  }, [selectedId, setActiveConversationId, refresh]);

  // Listen for new WS messages to update conversation list in real-time
  useEffect(() => {
    const unsub = onNewMessage((msg) => {
      // If the message is for the conversation we're currently viewing, mark it read
      if (msg.conversationId === selectedId) {
        markConversationRead(msg.conversationId).then(() => refresh());
      }

      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) {
          // New conversation we don't have yet — reload the full list
          loadConversations();
          return prev;
        }

        // Update existing conversation: bump to top, update lastMessage + unreadCount
        const updated = prev.map((c) => {
          if (c.id !== msg.conversationId) return c;
          return {
            ...c,
            lastMessage: {
              content: msg.content,
              senderId: msg.senderId,
              senderName: msg.sender
                ? `${msg.sender.firstName} ${msg.sender.lastName}`.trim()
                : "",
              createdAt: msg.createdAt,
            },
            // Only bump unread if this conversation isn't the one we're viewing
            unreadCount:
              c.id === selectedId ? c.unreadCount : c.unreadCount + 1,
          };
        });

        // Move the updated conversation to the top
        const conv = updated.find((c) => c.id === msg.conversationId)!;
        const rest = updated.filter((c) => c.id !== msg.conversationId);
        return [conv, ...rest];
      });
    });

    return unsub;
  }, [onNewMessage, selectedId, loadConversations, refresh]);

  // When selecting a conversation, reset its unread count locally and on the server
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
      markConversationRead(id).then(() => refresh());
    },
    [refresh]
  );

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="-mx-4 sm:-mx-6 -my-6 flex"
      style={{ height: "calc(100dvh - 0px)" }}
    >
      {/* Glass container */}
      <div className="flex w-full glass-card rounded-none lg:rounded-2xl lg:mx-4 lg:my-4 overflow-hidden">
        {/* Left panel: Conversation List */}
        <div
          className={`w-full lg:w-[320px] lg:border-r border-white/10 flex-col ${
            selectedId ? "hidden lg:flex" : "flex"
          }`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Right panel: Message Thread or Empty State */}
        <div
          className={`flex-1 flex-col ${
            selectedId ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedConversation ? (
            <MessageThread
              conversation={selectedConversation}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <ChatEmptyState />
          )}
        </div>
      </div>
    </motion.div>
  );
}
