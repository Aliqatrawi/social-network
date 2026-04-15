"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";
import { getUnreadChatCount, type ChatMessage } from "@/lib/api";
import { chatSocket } from "@/lib/chatSocket";
import { useAuth } from "./AuthContext";
import { showToast } from "@/lib/toast";

function ChatToastIcon() {
  return createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: "w-5 h-5",
    },
    createElement("path", {
      d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    })
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NewMessageListener = (msg: ChatMessage) => void;

interface ChatContextType {
  /** Total unread chat message count across all conversations */
  unreadCount: number;
  /** Re-fetch the unread count from the server */
  refresh: () => void;
  /** Subscribe to new incoming messages (returns unsubscribe fn) */
  onNewMessage: (fn: NewMessageListener) => () => void;
  /** The conversation ID the user is currently viewing (set by chat page) */
  activeConversationId: string | null;
  /** Set which conversation is currently open */
  setActiveConversationId: (id: string | null) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const POLL_INTERVAL = 30_000; // 30s fallback poll

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unwrapIncoming(data: any): { type: string; payload: any } | null {
  if (!data || typeof data === "string") return null;

  if (data.type === "typing" && data.payload) {
    return { type: "typing", payload: data.payload };
  }
  if (data.payload && (data.type === "chat_message" || data.type === "message")) {
    return { type: "chat_message", payload: data.payload };
  }
  if (data.type === "chat_message" || data.type === "message") {
    return { type: "chat_message", payload: data };
  }
  if (data.conversationId && data.content) {
    return { type: "chat_message", payload: data };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const listenersRef = useRef<Set<NewMessageListener>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeConvRef = useRef<string | null>(null);

  // Keep ref in sync so WS callback always has latest value
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // ---- Fetch unread count ----
  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    const result = await getUnreadChatCount();
    if (result.data) setUnreadCount(result.data.count);
  }, [isAuthenticated]);

  // Poll unread count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    fetchCount();
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchCount]);

  const refresh = useCallback(() => {
    fetchCount();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
  }, [fetchCount]);

  // ---- Subscribe API ----
  const onNewMessage = useCallback((fn: NewMessageListener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  // ---- Global WS listener ----
  useEffect(() => {
    if (!isAuthenticated) return;

    chatSocket.connect();

    const unsub = chatSocket.onMessage((raw) => {
      const parsed = unwrapIncoming(raw);
      if (!parsed || parsed.type !== "chat_message") return;

      const msg = parsed.payload as ChatMessage;
      const isOwnMessage = msg.senderId === user?.id;

      // Notify all listeners (chat page uses this to update conversation list)
      listenersRef.current.forEach((fn) => fn(msg));

      // Don't bump unread or toast for own messages
      if (isOwnMessage) return;

      // If this message is for the conversation the user is currently viewing, skip unread bump
      if (activeConvRef.current === msg.conversationId) return;

      // Bump unread count
      setUnreadCount((c) => c + 1);

      // Show toast notification
      const senderName = msg.sender
        ? `${msg.sender.firstName} ${msg.sender.lastName}`.trim()
        : "Someone";
      const preview =
        msg.content.length > 60 ? msg.content.slice(0, 60) + "..." : msg.content;

      showToast({
        title: senderName,
        description: preview,
        color: "primary",
        icon: createElement(ChatToastIcon),
      });
    });

    return () => { unsub(); };
  }, [isAuthenticated, user?.id]);

  return (
    <ChatContext.Provider
      value={{
        unreadCount,
        refresh,
        onNewMessage,
        activeConversationId,
        setActiveConversationId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
