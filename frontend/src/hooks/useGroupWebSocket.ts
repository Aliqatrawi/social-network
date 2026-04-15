"use client";

import { useEffect } from "react";
import { chatSocket } from "@/lib/chatSocket";
import { useGroupContext, type GroupEvent } from "@/context/GroupContext";

/**
 * Hook that listens to WebSocket messages for group events
 * and emits them through the GroupContext
 */
export function useGroupWebSocket() {
  const { emitGroupEvent } = useGroupContext();

  useEffect(() => {
    // Connect to WebSocket
    chatSocket.connect();

    // Listen to all incoming messages
    const unsubscribe = chatSocket.onMessage((message: any) => {
      // Check if this is a group event (not a chat message)
      if (message.type && message.groupId && message.type !== "chat_message" && message.type !== "typing") {
        const event: GroupEvent = {
          type: message.type as any,
          groupId: message.groupId,
          timestamp: message.timestamp || Date.now(),
          data: message.data,
        };

        // Emit through GroupContext so all listeners are notified
        emitGroupEvent(event);
      }
    });

    return unsubscribe;
  }, [emitGroupEvent]);
}
