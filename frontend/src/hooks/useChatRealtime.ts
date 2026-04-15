"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConversationMessages,
  sendChatMessage as sendChatMessageHTTP,
  markConversationRead,
  type ChatMessage,
} from "@/lib/api";
import { chatSocket } from "@/lib/chatSocket";

const PAGE_SIZE = 30;

function getMessageSeq(message: ChatMessage): number {
  return typeof message.seq === "number" ? message.seq : 0;
}

function compareMessages(a: ChatMessage, b: ChatMessage): number {
  const timeDiff =
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  if (timeDiff !== 0) return timeDiff;

  const seqDiff = getMessageSeq(a) - getMessageSeq(b);
  if (seqDiff !== 0) return seqDiff;

  return a.id.localeCompare(b.id);
}

function sortMessages(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort(compareMessages);
}

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();

  for (const msg of current) {
    byId.set(msg.id, msg);
  }

  for (const msg of incoming) {
    if (!msg?.id) continue;
    byId.set(msg.id, msg);
  }

  return sortMessages(Array.from(byId.values()));
}

function unwrapIncoming(data: any): { type: string; payload: any } | null {
  if (!data || typeof data === "string") return null;

  if (data.type === "typing" && data.payload) {
    console.log("[unwrapIncoming] Typing message:", data);
    return { type: "typing", payload: data.payload };
  }

  if (data.payload && (data.type === "chat_message" || data.type === "message")) {
    console.log("[unwrapIncoming] Chat message with payload:", data);
    return { type: "chat_message", payload: data.payload };
  }
  if (data.type === "chat_message" || data.type === "message") {
    console.log("[unwrapIncoming] Chat message without payload wrapper:", data);
    return { type: "chat_message", payload: data };
  }
  if (data.conversationId && data.content) {
    console.log("[unwrapIncoming] Chat message from flat payload:", data);
    return { type: "chat_message", payload: data };
  }

  console.log("[unwrapIncoming] Skipped message:", data);
  return null;
}

export function useChatRealtime(conversationId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const activeConvRef = useRef<string | null>(null);

  messagesRef.current = messages;
  activeConvRef.current = conversationId;

  useEffect(() => {
    // Always reset state immediately when conversationId changes
    setMessages([]);
    messagesRef.current = [];
    seenIdsRef.current = new Set();
    setHasMore(true);
    setTypingUser(null);

    if (!conversationId) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getConversationMessages(conversationId, {
    limit: PAGE_SIZE,
    offset: 0,
    }).then((result) => {
      if (cancelled || activeConvRef.current !== conversationId) return;
      if (result.data) {
        const sorted = sortMessages(result.data);
        messagesRef.current = sorted;
        setMessages(sorted);
        seenIdsRef.current = new Set(sorted.map((m) => m.id));
        setHasMore(result.data.length >= PAGE_SIZE);
      }
      setIsLoading(false);
      markConversationRead(conversationId);
    });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const loadMore = useCallback(async (): Promise<number> => {
    if (!conversationId || busyRef.current) return 0;

    const current = messagesRef.current;
    if (current.length === 0) return 0;

    busyRef.current = true;
    setIsLoadingMore(true);

  const result = await getConversationMessages(conversationId, {
   limit: PAGE_SIZE,
   offset: current.length,
  });

    let count = 0;
    if (result.data) {
      const newMsgs = result.data.filter((m) => !seenIdsRef.current.has(m.id));
      newMsgs.forEach((m) => seenIdsRef.current.add(m.id));
      count = newMsgs.length;

      if (count > 0) {
        const merged = mergeMessages(messagesRef.current, newMsgs);
        messagesRef.current = merged;
        setMessages(merged);
      }

      setHasMore(result.data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setIsLoadingMore(false);
    busyRef.current = false;
    return count;
  }, [conversationId]);

  useEffect(() => {
    // Ensure socket is connected
    chatSocket.connect();

    // Set up listener for this conversation
    const unsub = chatSocket.onMessage((raw) => {
      // Parse incoming message
      const parsed = unwrapIncoming(raw);
      if (!parsed) return;

      // Only process if we have an active conversation
      const activeId = activeConvRef.current;
      console.log("[useChatRealtime] Parsed message type:", parsed.type, "Active conversation:", activeId);
      if (!activeId) {
        console.log("[useChatRealtime] No active conversation, skipping");
        return;
      }

      if (parsed.type === "typing") {
        // Handle typing indicator
        console.log("[useChatRealtime] Processing typing message for conv:", parsed.payload.conversationId);
        if (parsed.payload.conversationId !== activeId) {
          console.log("[useChatRealtime] Typing is for different conversation, skipping");
          return;
        }
        setTypingUser(parsed.payload.userName || "Someone");
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
        return;
      }

      if (parsed.type === "chat_message") {
        // Handle incoming message
        const m = parsed.payload as ChatMessage;
        console.log("[useChatRealtime] Processing chat message:", m.conversationId, "Active:", activeId);
        
        // Only process messages for the active conversation
        if (m.conversationId !== activeId) {
          console.log("[useChatRealtime] Message is for different conversation, skipping");
          return;
        }
        
        // Skip if we've already seen this message
        if (m.id && seenIdsRef.current.has(m.id)) {
          console.log("[useChatRealtime] Already seen message, skipping");
          return;
        }
        
        // Mark as seen and add to messages
        console.log("[useChatRealtime] Adding message to state");
        if (m.id) seenIdsRef.current.add(m.id);
        const updated = mergeMessages(messagesRef.current, [m]);
        messagesRef.current = updated;
        setMessages(updated);
        setTypingUser(null);
        markConversationRead(activeId);
      }
    });

    return () => {
      unsub();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId) return;

      console.log("[useChatRealtime] sendMessage via WebSocket:", conversationId, content);
      
      // Send via WebSocket for true real-time delivery
      // The backend will process it, save to DB, and broadcast back to all users including the sender
      const sent = chatSocket.sendChatMessage(conversationId, content);
      
      if (!sent) {
        console.log("[useChatRealtime] WebSocket not ready, falling back to HTTP");
        // Fallback to HTTP if WebSocket isn't ready
        const result = await sendChatMessageHTTP({ conversationId, content });
        if (result.data) {
          const m = result.data;
          if (m.id && !seenIdsRef.current.has(m.id)) {
            seenIdsRef.current.add(m.id);
            const updated = mergeMessages(messagesRef.current, [m]);
            messagesRef.current = updated;
            setMessages(updated);
          }
        }
      }
    },
    [conversationId],
  );

  const sendTyping = useCallback(() => {
    if (!conversationId) return;
    chatSocket.sendTyping(conversationId);
  }, [conversationId]);

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    isTyping: !!typingUser,
    typingUser,
    sendMessage,
    sendTyping,
    loadMore,
  };
}