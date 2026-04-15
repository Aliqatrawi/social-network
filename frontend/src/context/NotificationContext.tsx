"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getUnreadNotificationCount, type Notification } from "@/lib/api";
import { chatSocket } from "@/lib/chatSocket";
import { useAuth } from "./AuthContext";

type NotificationListener = (notif: Notification) => void;

interface NotificationContextType {
  unreadCount: number;
  /** Call this after any action that changes notification state (mark read, accept/decline, etc.) */
  refresh: () => void;
  /** Subscribe to real-time incoming notifications (returns unsubscribe fn) */
  onNewNotification: (fn: NotificationListener) => () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

const POLL_INTERVAL = 15_000; // 15 seconds

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<Set<NotificationListener>>(new Set());

  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    const result = await getUnreadNotificationCount();
    if (result.data) {
      setUnreadCount(result.data.count);
    }
  }, [isAuthenticated]);

  // Start polling when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    // Fetch immediately
    fetchCount();

    // Then poll
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, fetchCount]);

  // Listen for real-time notification messages from WebSocket
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsub = chatSocket.onMessage((raw: any) => {
      if (!raw || raw.type !== "notification" || !raw.payload) return;

      const { notification, unreadCount: count } = raw.payload;

      if (typeof count === "number") {
        setUnreadCount(count);
      }

      if (notification) {
        listenersRef.current.forEach((fn) => fn(notification as Notification));
      }
    });

    return () => { unsub(); };
  }, [isAuthenticated]);

  // Manual refresh — also resets the poll timer so we don't double-fetch
  const refresh = useCallback(() => {
    fetchCount();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL);
  }, [fetchCount]);

  const onNewNotification = useCallback((fn: NotificationListener) => {
    listenersRef.current.add(fn);
    return () => { listenersRef.current.delete(fn); };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh, onNewNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
