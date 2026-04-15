"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getConversationMessages,
  sendChatMessage,
  type ChatMessage,
} from "@/lib/api";

const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === "true";

export function useMockChat(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    const result = await getConversationMessages(conversationId);
    if (result.data) setMessages(result.data);
    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadMessages();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loadMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      const result = await sendChatMessage({ conversationId, content });
      if (result.data) {
        setMessages((prev) => [...prev, result.data!]);
      }

      // Simulate auto-reply in dev mode
      if (DEV_AUTH) {
        const delay = 1500 + Math.random() * 1500; // 1.5–3s

        // Show typing indicator
        setIsTyping(true);

        timerRef.current = setTimeout(async () => {
          // Dynamically import to get the auto-reply function
          const { getMockAutoReply } = await import("@/lib/mock-data");
          const reply = getMockAutoReply(conversationId);

          setIsTyping(false);
          setTypingUser(null);

          if (reply) {
            setMessages((prev) => [...prev, reply]);
            setTypingUser(reply.sender.firstName);
          }
        }, delay);

        // Set typing user name for display
        // We'll get it from the reply when it arrives, but for the indicator
        // we can show a generic "typing" state
      }
    },
    [conversationId],
  );

  return {
    messages,
    isLoading,
    isTyping,
    typingUser,
    sendMessage,
  };
}
