"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export type GroupEventType = "post_created" | "post_deleted" | "comment_added" | "event_changed" | "member_joined" | "member_left";

export interface GroupEvent {
  type: GroupEventType;
  groupId: string;
  timestamp: number;
  data?: Record<string, any>;
}

type GroupEventListener = (event: GroupEvent) => void;

interface GroupContextType {
  /** Subscribe to group events (returns unsubscribe fn) */
  onGroupEvent: (fn: GroupEventListener) => () => void;
  /** Emit a group event */
  emitGroupEvent: (event: GroupEvent) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<Set<GroupEventListener>>(new Set());

  const emitGroupEvent = useCallback((event: GroupEvent) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error("Error in GroupEvent listener:", e);
      }
    });
  }, []);

  const onGroupEvent = useCallback((fn: GroupEventListener) => {
    listenersRef.current.add(fn);
    return () => {
      listenersRef.current.delete(fn);
    };
  }, []);

  // Initialize WebSocket listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Dynamically import and use the hook
    const initializeWebSocket = async () => {
      try {
        const { chatSocket } = await import("@/lib/chatSocket");
        chatSocket.connect();

        unsubscribe = chatSocket.onMessage((message: any) => {
          // Check if this is a group event (wrapped in payload for non-chat messages)
          if (message.type === "group_event" && message.payload) {
            const payload = message.payload;
            if (
              payload.type &&
              payload.groupId &&
              payload.type !== "chat_message" &&
              payload.type !== "typing"
            ) {
              const event: GroupEvent = {
                type: payload.type as GroupEventType,
                groupId: payload.groupId,
                timestamp: payload.timestamp || Date.now(),
                data: payload.data,
              };

              // Emit through GroupContext so all listeners are notified
              emitGroupEvent(event);
            }
          }
        });
      } catch (e) {
        console.warn("Failed to initialize group WebSocket:", e);
      }
    };

    initializeWebSocket();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [emitGroupEvent]);

  return (
    <GroupContext.Provider value={{ onGroupEvent, emitGroupEvent }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroupContext must be used within a GroupProvider");
  }
  return context;
}
