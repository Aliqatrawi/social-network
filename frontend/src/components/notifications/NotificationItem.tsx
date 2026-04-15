"use client";

import { useState, type ReactNode } from "react";
import { Avatar, Button } from "@heroui/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  markNotificationRead,
  acceptFollowRequest,
  declineFollowRequest,
  acceptGroupInvitation,
  declineGroupInvitation,
  acceptJoinRequest,
  declineJoinRequest,
  type Notification,
} from "@/lib/api";
import { showToast } from "@/lib/toast";

interface NotificationItemProps {
  notification: Notification;
  onUpdate?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// --- Icons for each notification type ---

function FollowRequestIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function FollowAcceptedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

function NewFollowerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function LikeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function DislikeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M10 14H5.236a2 2 0 0 1-1.995-1.85L2.333 5.15A2 2 0 0 1 4.328 3H10" />
      <path d="M14 10V3" />
      <path d="M14 14v7" />
      <path d="M14 21l4-7h2.764a2 2 0 0 0 1.995-1.85l.908-7A2 2 0 0 0 21.672 3H18" />
    </svg>
  );
}

function GroupInviteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GroupJoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function GroupEventIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function KickedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="18" y1="8" x2="23" y2="13" />
      <line x1="23" y1="8" x2="18" y2="13" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function DeclinedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function DefaultIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface IconConfig {
  icon: ReactNode;
  bg: string;
}

function getIconConfig(type: Notification["type"]): IconConfig {
  switch (type) {
    case "follow_request":
      return { icon: <FollowRequestIcon />, bg: "bg-primary" };
    case "follow_accepted":
    case "new_follower":
      return { icon: <FollowAcceptedIcon />, bg: "bg-primary-700" };
    case "comment":
      return { icon: <CommentIcon />, bg: "bg-primary-600" };
    case "like":
      return { icon: <LikeIcon />, bg: "bg-primary" };
    case "dislike":
      return { icon: <DislikeIcon />, bg: "bg-secondary-700" };
    case "group_invitation":
      return { icon: <GroupInviteIcon />, bg: "bg-primary" };
    case "group_join_request":
      return { icon: <GroupJoinIcon />, bg: "bg-primary-600" };
    case "group_join_accepted":
      return { icon: <FollowAcceptedIcon />, bg: "bg-primary-700" };
    case "group_event":
      return { icon: <GroupEventIcon />, bg: "bg-primary-600" };
    case "group_kicked":
      return { icon: <KickedIcon />, bg: "bg-secondary-700" };
    case "group_member_left":
      return { icon: <LeaveIcon />, bg: "bg-secondary-600" };
    case "group_invitation_declined":
      return { icon: <DeclinedIcon />, bg: "bg-secondary-700" };
    default:
      return { icon: <DefaultIcon />, bg: "bg-secondary" };
  }
}

// --- Rich message builder ---

function NotificationMessage({ notification }: { notification: Notification }) {
  const { type, actor, metadata } = notification;
  const actorName = `${actor.firstName} ${actor.lastName}`;
  const groupName = metadata?.groupName;
  const groupId = metadata?.groupId;
  const postTitle = metadata?.postTitle;
  const postId = metadata?.postId;
  const eventTitle = metadata?.eventTitle;

  const groupLink = groupId ? (
    <Link
      href={`/groups/${groupId}`}
      className="font-semibold text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {groupName || "a group"}
    </Link>
  ) : (
    <span className="font-medium">{groupName || "a group"}</span>
  );

  const postLink = postTitle ? (
    <span className="font-semibold">&quot;{postTitle}&quot;</span>
  ) : (
    <span>your post</span>
  );

  switch (type) {
    case "follow_request":
      return <span>wants to follow you</span>;
    case "follow_accepted":
      return <span>accepted your follow request</span>;
    case "new_follower":
      return <span>started following you</span>;
    case "comment":
      return <span>commented on {postLink}</span>;
    case "like":
      return <span>liked {postLink}</span>;
    case "dislike":
      return <span>disliked {postLink}</span>;
    case "group_invitation":
      return <span>invited you to join {groupLink}</span>;
    case "group_join_request":
      return <span>requested to join {groupLink}</span>;
    case "group_join_accepted":
      return <span>accepted your request to join {groupLink}</span>;
    case "group_event":
      return (
        <span>
          created {eventTitle ? (
            <span className="font-medium">{eventTitle}</span>
          ) : "an event"} in {groupLink}
        </span>
      );
    case "group_kicked":
      return <span>removed you from {groupLink}</span>;
    case "group_member_left":
      return <span>left {groupLink}</span>;
    case "group_invitation_declined":
      return <span>declined your invitation to join {groupLink}</span>;
    default:
      return <span>interacted with you</span>;
  }
}

export function NotificationItem({
  notification,
  onUpdate,
}: NotificationItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { actor, type, isRead, createdAt, actorId } = notification;
  const iconConfig = getIconConfig(type);

  async function handleClick() {
    if (isRead) return;
    await markNotificationRead(notification.id);
    onUpdate?.();
  }

  async function handleAccept() {
    setIsLoading(true);
    const result = await acceptFollowRequest(actorId);

    if (result.error) {
      showToast({
        title: "Action failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Request accepted",
      description: `${actor.firstName} is now following you.`,
      color: "success",
    });
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleDecline() {
    setIsLoading(true);
    const result = await declineFollowRequest(actorId);

    if (result.error) {
      showToast({
        title: "Action failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Request declined",
      color: "primary",
    });
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleAcceptGroupInvite() {
    if (!notification.metadata?.groupId) return;
    setIsLoading(true);
    const result = await acceptGroupInvitation(notification.metadata.groupId);

    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      setIsLoading(false);
      return;
    }

    showToast({ title: "Invitation accepted", description: "You joined the group!", color: "success" });
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleDeclineGroupInvite() {
    if (!notification.metadata?.groupId) return;
    setIsLoading(true);
    const result = await declineGroupInvitation(notification.metadata.groupId);

    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      setIsLoading(false);
      return;
    }

    showToast({ title: "Invitation declined", color: "primary" });
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleAcceptJoinRequest() {
    if (!notification.metadata?.groupId) return;
    setIsLoading(true);
    const result = await acceptJoinRequest(notification.metadata.groupId, actorId);

    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Request accepted",
      description: `${actor.firstName} is now a member of the group.`,
      color: "success",
    });
    onUpdate?.();
    setIsLoading(false);
  }

  async function handleDeclineJoinRequest() {
    if (!notification.metadata?.groupId) return;
    setIsLoading(true);
    const result = await declineJoinRequest(notification.metadata.groupId, actorId);

    if (result.error) {
      showToast({ title: "Action failed", description: result.error, color: "danger" });
      setIsLoading(false);
      return;
    }

    showToast({ title: "Request declined", color: "primary" });
    onUpdate?.();
    setIsLoading(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`rounded-xl p-4 transition-all duration-200 cursor-pointer ${
        isRead
          ? "bg-black/5 dark:bg-white/5"
          : "bg-primary/10 border border-primary/20"
      } hover:bg-black/10 dark:hover:bg-white/10`}
    >
      <div className="flex gap-3">
        {/* Avatar with type icon badge */}
        <div className="relative shrink-0">
          <Link
            href={`/profile/${actorId}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar
              src={actor.avatarUrl}
              name={`${actor.firstName} ${actor.lastName}`}
              size="md"
              className="cursor-pointer"
            />
          </Link>
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${iconConfig.bg} text-white flex items-center justify-center ring-2 ring-background`}>
            {iconConfig.icon}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <Link
              href={`/profile/${actorId}`}
              className="font-semibold hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {actor.firstName} {actor.lastName}
            </Link>{" "}
            <span className="text-default-600">
              <NotificationMessage notification={notification} />
            </span>
          </p>
          <p className="text-xs text-default-400 mt-1">
            {formatRelativeTime(createdAt)}
          </p>

          {type === "follow_request" && notification.actionPending && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                color="primary"
                variant="solid"
                isLoading={isLoading}
                onPress={handleAccept}
                className="shadow-md shadow-primary/20"
              >
                Accept
              </Button>
              <Button
                size="sm"
                color="default"
                variant="bordered"
                isLoading={isLoading}
                onPress={handleDecline}
              >
                Decline
              </Button>
            </div>
          )}

          {type === "group_invitation" && notification.actionPending && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                color="primary"
                variant="solid"
                isLoading={isLoading}
                onPress={handleAcceptGroupInvite}
                className="shadow-md shadow-primary/20"
              >
                Accept
              </Button>
              <Button
                size="sm"
                color="default"
                variant="bordered"
                isLoading={isLoading}
                onPress={handleDeclineGroupInvite}
              >
                Decline
              </Button>
            </div>
          )}

          {type === "group_join_request" && notification.actionPending && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                color="primary"
                variant="solid"
                isLoading={isLoading}
                onPress={handleAcceptJoinRequest}
                className="shadow-md shadow-primary/20"
              >
                Accept
              </Button>
              <Button
                size="sm"
                color="default"
                variant="bordered"
                isLoading={isLoading}
                onPress={handleDeclineJoinRequest}
              >
                Decline
              </Button>
            </div>
          )}
        </div>

        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  );
}
