"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import { NotificationItem } from "./NotificationItem";
import { NotificationSkeletonList } from "@/components/skeletons/NotificationSkeleton";
import {
  getNotifications,
  markAllNotificationsRead,
  type Notification,
} from "@/lib/api";
import { useNotifications } from "@/context/NotificationContext";
import { showToast } from "@/lib/toast";

const PAGE_SIZE = 20;

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const { refresh: refreshNotificationCount, onNewNotification } = useNotifications();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // Listen for real-time notifications and prepend them
  useEffect(() => {
    return onNewNotification((notif) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    });
  }, [onNewNotification]);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    const result = await getNotifications({ limit: PAGE_SIZE, offset: 0 });
    if (result.data) {
      setNotifications(result.data);
      setHasMore(result.data.length >= PAGE_SIZE);
    }
    setIsLoading(false);
    refreshNotificationCount();
  }, [refreshNotificationCount]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoadingMore(true);

    const result = await getNotifications({ limit: PAGE_SIZE, offset: notifications.length });
    if (result.data) {
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const newItems = result.data!.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newItems];
      });
      setHasMore(result.data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }

    setIsLoadingMore(false);
    loadingRef.current = false;
  }, [hasMore, notifications.length]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  async function handleMarkAllRead() {
    setIsMarkingAll(true);
    const result = await markAllNotificationsRead();

    if (result.error) {
      showToast({
        title: "Action failed",
        description: result.error,
        color: "danger",
      });
      setIsMarkingAll(false);
      return;
    }

    showToast({
      title: "All marked as read",
      color: "primary",
    });
    await loadNotifications();
    setIsMarkingAll(false);
  }

  if (isLoading) {
    return (
      <Card className="glass-card shadow-sm">
        <CardBody className="p-3">
          <NotificationSkeletonList count={5} />
        </CardBody>
      </Card>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-default-500">
            {unreadCount} unread
          </p>
          <Button
            size="sm"
            variant="flat"
            color="primary"
            isLoading={isMarkingAll}
            onPress={handleMarkAllRead}
          >
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.length > 0 ? (
        <>
          <Card className="glass-card shadow-sm">
            <CardBody className="p-3 space-y-2">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onUpdate={loadNotifications}
                  />
                ))}
              </AnimatePresence>
            </CardBody>
          </Card>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {isLoadingMore && <Spinner size="sm" color="primary" />}
            </div>
          )}
        </>
      ) : (
        <Card className="glass-card">
        <CardBody className="p-8 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-12 h-12 mx-auto text-default-300 mb-4"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <h3 className="font-semibold mb-1">No notifications</h3>
          <p className="text-default-400 text-sm">
            You&apos;re all caught up!
          </p>
        </CardBody>
        </Card>
      )}
    </div>
  );
}
